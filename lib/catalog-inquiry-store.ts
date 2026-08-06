import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Lista de consulta del catálogo público.
 * Independiente de quote-store / cotizaciones internas.
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
  phone: string
  email: string
  locality: string
  clientType: ClientType | ''
  generalComment: string
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
  /** Agrega o incrementa cantidad si ya existe. Retorna si era nuevo. */
  addItem: (item: CatalogInquiryAddInput) => { added: boolean; quantity: number }
  setQuantity: (productId: number, quantity: number) => void
  setItemComment: (productId: number, comment: string) => void
  removeItem: (productId: number) => void
  clearItems: () => void
  clearContact: () => void
  /** Limpia lista + datos de contacto tras un envío exitoso al servidor. */
  clearAfterSuccessfulSubmit: () => void
  setContactField: <K extends keyof CatalogInquiryContact>(
    key: K,
    value: CatalogInquiryContact[K],
  ) => void
  itemCount: () => number
  hasItem: (productId: number) => boolean
}

const emptyContact = (): CatalogInquiryContact => ({
  name: '',
  company: '',
  phone: '',
  email: '',
  locality: '',
  clientType: '',
  generalComment: '',
})

export const useCatalogInquiryStore = create<CatalogInquiryState>()(
  persist(
    (set, get) => ({
      items: [],
      contact: emptyContact(),

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

      clearAfterSuccessfulSubmit: () =>
        set({ items: [], contact: emptyContact() }),

      setContactField: (key, value) => {
        set((state) => ({
          contact: { ...state.contact, [key]: value },
        }))
      },

      itemCount: () => get().items.length,

      hasItem: (productId) =>
        get().items.some((i) => i.productId === productId),
    }),
    {
      name: 'ifedel-catalog-inquiry-v2',
      partialize: (state) => ({
        items: state.items,
        contact: state.contact,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CatalogInquiryState> | undefined
        return {
          ...current,
          ...p,
          contact: { ...emptyContact(), ...(p?.contact ?? {}) },
          items: Array.isArray(p?.items) ? p.items : current.items,
        }
      },
    },
  ),
)
