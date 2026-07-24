import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuoteItem {
  productId: number
  sku: string
  title: string
  unitPriceUSD: number
  taxRate: number
  qty: number
  imageUrl?: string
}

export interface QuoteClient {
  name?: string
  company?: string
  email?: string
  phone?: string
}

export interface QuoteMeta {
  validityDays: number
  exchangeRateARS: number
  discountPct: number
  paymentTermCode?: string
}

interface QuoteState {
  items: QuoteItem[]
  client: QuoteClient
  meta: QuoteMeta
  addItem: (item: Omit<QuoteItem, 'qty'>, qty?: number) => void
  updateQty: (productId: number, qty: number) => void
  removeItem: (productId: number) => void
  clear: () => void
  setClientField: (key: keyof QuoteClient, value: string) => void
  setExchangeRateARS: (value: number) => void
  setValidityDays: (value: number) => void
  setDiscountPct: (value: number) => void
}

export const useQuoteStore = create<QuoteState>()(
  persist(
    (set, get) => ({
      items: [],
      client: {},
      meta: {
        validityDays: 7,
        exchangeRateARS: 1000,
        discountPct: 0,
        paymentTermCode: 'CONTADO',
      },
      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, qty: i.qty + qty } : i
              ),
            }
          }
          return {
            items: [
              ...state.items,
              {
                ...item,
                qty,
              },
            ],
          }
        }),
      updateQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter((i) => i.productId !== productId),
            }
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, qty } : i
            ),
          }
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      clear: () =>
        set(() => ({
          items: [],
          client: {},
          meta: {
            validityDays: 7,
            exchangeRateARS: 1000,
            discountPct: 0,
            paymentTermCode: 'CONTADO',
          },
        })),
      setClientField: (key, value) =>
        set((state) => ({
          client: {
            ...state.client,
            [key]: value,
          },
        })),
      setExchangeRateARS: (value) =>
        set((state) => ({
          meta: {
            ...state.meta,
            exchangeRateARS: value > 0 ? value : state.meta.exchangeRateARS,
          },
        })),
      setValidityDays: (value) =>
        set((state) => ({
          meta: {
            ...state.meta,
            validityDays: value > 0 ? value : state.meta.validityDays,
          },
        })),
      setDiscountPct: (value) =>
        set((state) => ({
          meta: {
            ...state.meta,
            discountPct: Math.min(
              100,
              Math.max(0, Number.isFinite(value) ? value : 0)
            ),
          },
        })),
    }),
    {
      name: 'ifedel-quote-store',
      partialize: (state) => ({
        items: state.items,
        client: state.client,
        meta: state.meta,
      }),
    }
  )
)

