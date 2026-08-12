import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Lista de consulta del catálogo público.
 * No persiste precios: el TC / listas pueden cambiar.
 * Solo datos públicos seguros (sin cost, precios internos, etc.).
 */

export const CLIENT_TYPES = [
  'Veterinaria',
  'Agropecuaria',
  'Productor',
  'Distribuidor',
  'Empresa',
  'Otro',
] as const

export type ClientType = (typeof CLIENT_TYPES)[number]

export type CatalogInquiryItem = {
  productId: number
  slug: string
  sku: string
  title: string
  primaryImage: string | null
  quantity: number
  comment: string
}

export type CatalogInquiryContact = {
  name: string
  company: string
  taxId: string
  phone: string
  email: string
  clientType: ClientType | ''
  generalComment: string
}

export type CatalogInquiryDelivery = {
  address: string
  city: string
  province: string
  postalCode: string
  notes: string
}

export type CatalogInquiryAddInput = {
  productId: number
  slug: string
  sku: string
  title: string
  primaryImage?: string | null
  quantity?: number
}

type CatalogInquiryState = {
  items: CatalogInquiryItem[]
  contact: CatalogInquiryContact
  delivery: CatalogInquiryDelivery
  /** Agrega o incrementa cantidad si ya existe. Retorna si era nuevo. */
  addItem: (item: CatalogInquiryAddInput) => { added: boolean; quantity: number }
  setQuantity: (productId: number, quantity: number) => void
  setItemComment: (productId: number, comment: string) => void
  removeItem: (productId: number) => void
  clearItems: () => void
  clearContact: () => void
  clearDelivery: () => void
  /** Limpia lista + datos de contacto/entrega tras un envío exitoso. */
  clearAfterSuccessfulSubmit: () => void
  setContactField: <K extends keyof CatalogInquiryContact>(
    key: K,
    value: CatalogInquiryContact[K],
  ) => void
  setDeliveryField: <K extends keyof CatalogInquiryDelivery>(
    key: K,
    value: CatalogInquiryDelivery[K],
  ) => void
  itemCount: () => number
  hasItem: (productId: number) => boolean
}

const emptyContact = (): CatalogInquiryContact => ({
  name: '',
  company: '',
  taxId: '',
  phone: '',
  email: '',
  clientType: '',
  generalComment: '',
})

const emptyDelivery = (): CatalogInquiryDelivery => ({
  address: '',
  city: '',
  province: '',
  postalCode: '',
  notes: '',
})

function migratePersistedContact(
  raw: Partial<CatalogInquiryContact> & { locality?: string } | undefined,
): CatalogInquiryContact {
  const next = { ...emptyContact(), ...(raw ?? {}) }
  delete (next as { locality?: string }).locality
  return next
}

function migratePersistedDelivery(
  raw: Partial<CatalogInquiryDelivery> | undefined,
  oldContact?: { locality?: string },
): CatalogInquiryDelivery {
  const next = { ...emptyDelivery(), ...(raw ?? {}) }
  if (!next.city.trim() && oldContact?.locality?.trim()) {
    next.city = oldContact.locality.trim()
  }
  return next
}

export const useCatalogInquiryStore = create<CatalogInquiryState>()(
  persist(
    (set, get) => ({
      items: [],
      contact: emptyContact(),
      delivery: emptyDelivery(),

      addItem: (input) => {
        const qty = Math.max(1, Math.floor(input.quantity ?? 1))
        const existing = get().items.find((i) => i.productId === input.productId)
        if (existing) {
          const quantity = existing.quantity + qty
          set((state) => ({
            items: state.items.map((i) =>
              i.productId === input.productId ? { ...i, quantity } : i,
            ),
          }))
          return { added: false, quantity }
        }
        set((state) => ({
          items: [
            ...state.items,
            {
              productId: input.productId,
              slug: input.slug,
              sku: input.sku,
              title: input.title,
              primaryImage: input.primaryImage ?? null,
              quantity: qty,
              comment: '',
            },
          ],
        }))
        return { added: true, quantity: qty }
      },

      setQuantity: (productId, quantity) => {
        const q = Math.floor(quantity)
        if (q < 1) {
          set((state) => ({
            items: state.items.filter((i) => i.productId !== productId),
          }))
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: q } : i,
          ),
        }))
      },

      setItemComment: (productId, comment) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, comment } : i,
          ),
        }))
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      clearItems: () => set({ items: [] }),

      clearContact: () => set({ contact: emptyContact() }),

      clearDelivery: () => set({ delivery: emptyDelivery() }),

      clearAfterSuccessfulSubmit: () =>
        set({
          items: [],
          contact: emptyContact(),
          delivery: emptyDelivery(),
        }),

      setContactField: (key, value) => {
        set((state) => ({
          contact: { ...state.contact, [key]: value },
        }))
      },

      setDeliveryField: (key, value) => {
        set((state) => ({
          delivery: { ...state.delivery, [key]: value },
        }))
      },

      itemCount: () => get().items.length,

      hasItem: (productId) =>
        get().items.some((i) => i.productId === productId),
    }),
    {
      name: 'ifedel-catalog-inquiry-v3',
      partialize: (state) => ({
        items: state.items,
        contact: state.contact,
        delivery: state.delivery,
      }),
      merge: (persisted, current) => {
        const p = persisted as
          | (Partial<CatalogInquiryState> & {
              contact?: CatalogInquiryContact & { locality?: string }
            })
          | undefined
        return {
          ...current,
          ...p,
          contact: migratePersistedContact(p?.contact),
          delivery: migratePersistedDelivery(p?.delivery, p?.contact),
          items: Array.isArray(p?.items) ? p.items : current.items,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (typeof window === 'undefined') return
        try {
          const raw = window.localStorage.getItem('ifedel-catalog-inquiry-v2')
          if (!raw) return
          const parsed = JSON.parse(raw) as {
            state?: {
              items?: CatalogInquiryItem[]
              contact?: CatalogInquiryContact & { locality?: string }
            }
          }
          const legacy = parsed.state
          const current = state ?? useCatalogInquiryStore.getState()
          if (
            current.items.length === 0 &&
            Array.isArray(legacy?.items) &&
            legacy.items.length > 0
          ) {
            useCatalogInquiryStore.setState({
              items: legacy.items,
              contact: migratePersistedContact(legacy.contact),
              delivery: migratePersistedDelivery(undefined, legacy.contact),
            })
          }
          window.localStorage.removeItem('ifedel-catalog-inquiry-v2')
        } catch {
          /* ignore */
        }
      },
    },
  ),
)
