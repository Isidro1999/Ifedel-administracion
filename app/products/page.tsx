'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { useQuoteStore } from '@/lib/quote-store'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import {
  PRODUCTS_LIST_DEFAULT_SORT,
  PRODUCTS_LIST_PATH,
  type ProductsListSort,
  type ProductsListState,
  buildProductsListHref,
  parseProductsListState,
  buildProductsListReturnUrl,
  buildProductDetailHref,
} from '@/lib/products-list-url'

interface Product {
  id: number
  sku: string
  title: string
  short: string | null
  brand: { name: string }
  category: { name: string }
  images: Array<{ url: string; isPrimary: boolean }>
  prices: Array<{
    netPrice: number
    currency: string
    priceList: string
    taxRate?: number | null
  }>
}

interface Facets {
  brands: Array<{ name: string; count: number }>
  categories: Array<{ name: string; count: number }>
}

interface ProductsResponse {
  items: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  facets: Facets
}

function ProductsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const listState = useMemo(
    () => parseProductsListState(searchParams),
    [searchParams],
  )

  const [products, setProducts] = useState<Product[]>([])
  const [facets, setFacets] = useState<Facets>({ brands: [], categories: [] })
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState<{
    usdArsRate: number | null
    updatedAt: string | null
  } | null>(null)

  /** Input local con debounce; se sincroniza desde URL al montar / Back-Forward. */
  const [qInput, setQInput] = useState(listState.q)

  useEffect(() => {
    setQInput(listState.q)
  }, [listState.q])

  const replaceListUrl = useCallback(
    (patch: Parameters<typeof buildProductsListHref>[1]) => {
      const href = buildProductsListHref(listState, patch)
      const current =
        searchParams.toString() === ''
          ? PRODUCTS_LIST_PATH
          : `${PRODUCTS_LIST_PATH}?${searchParams.toString()}`
      if (href === current) return
      router.replace(href, { scroll: false })
    },
    [listState, router, searchParams],
  )

  useEffect(() => {
    const id = window.setTimeout(() => {
      const nextQ = qInput.trim()
      if (nextQ === listState.q) return
      replaceListUrl({ q: nextQ || null, page: null })
    }, 400)
    return () => window.clearTimeout(id)
  }, [qInput, listState.q, replaceListUrl])

  const fetchProducts = useCallback(async (state: ProductsListState) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(state.page),
        pageSize: String(state.pageSize),
        sort: state.sort,
      })
      if (state.q) params.set('q', state.q)
      if (state.brand) params.set('brand', state.brand)
      if (state.category) params.set('category', state.category)

      const res = await fetch(`/api/products?${params}`)
      const data: ProductsResponse = await res.json()
      setProducts(data.items)
      setFacets(data.facets)
      setPaginationMeta({
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      })
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProducts(listState)
  }, [listState, fetchProducts])

  useEffect(() => {
    const loadRate = async () => {
      try {
        const res = await fetch('/api/settings/exchange-rate')
        if (!res.ok) return
        const data = (await res.json()) as {
          usdArsRate: number | null
          updatedAt: string | null
        }
        setExchangeRate(data)
      } catch (error) {
        console.error('Error fetching exchange rate:', error)
      }
    }
    void loadRate()
  }, [])

  const handleFilterChange = (
    key: 'brand' | 'category' | 'sort',
    value: string,
  ) => {
    if (key === 'sort') {
      const sort = (value || PRODUCTS_LIST_DEFAULT_SORT) as ProductsListSort
      replaceListUrl({
        sort: sort === PRODUCTS_LIST_DEFAULT_SORT ? null : sort,
        page: null,
      })
      return
    }
    replaceListUrl({
      [key]: value || null,
      page: null,
    })
  }

  const goToPage = (page: number) => {
    replaceListUrl({ page: page <= 1 ? null : page })
  }

  const getDisplayPrice = (product: Product) => {
    if (product.prices.length === 0) return null
    const price = product.prices[0]
    const taxRate = price.taxRate ?? 0
    return formatCurrency(price.netPrice * (1 + taxRate / 100), price.currency)
  }

  const { items, addItem, updateQty, removeItem } = useQuoteStore()

  const getQtyForProduct = (productId: number) =>
    items.find((i) => i.productId === productId)?.qty ?? 0

  const totalItems = items.reduce((acc, item) => acc + item.qty, 0)

  const listReturnUrl = useMemo(
    () => buildProductsListReturnUrl(searchParams),
    [searchParams],
  )

  const productDetailHref = useCallback(
    (productId: number) => buildProductDetailHref(productId, listReturnUrl),
    [listReturnUrl],
  )

  return (
    <div className="space-y-6 relative">
      <PageHeader
        title="Catálogo de productos"
        description="Explorá el catálogo y armá cotizaciones rápidas a partir de los productos disponibles."
        actions={
          <Link
            href="/admin/import"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Importar productos
          </Link>
        }
      />

      <SectionCard
        title="Filtros de búsqueda"
        description="Acotá el catálogo por texto, marca, categoría y orden para encontrar más rápido lo que necesitás."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ifedel-black">
              Búsqueda
            </label>
            <input
              type="text"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ifedel-primary focus:ring-2 focus:ring-ifedel-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ifedel-black">
              Marca
            </label>
            <select
              value={listState.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ifedel-primary focus:ring-2 focus:ring-ifedel-primary"
            >
              <option value="">Todas</option>
              {facets.brands.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ifedel-black">
              Categoría
            </label>
            <select
              value={listState.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ifedel-primary focus:ring-2 focus:ring-ifedel-primary"
            >
              <option value="">Todas</option>
              {facets.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ifedel-black">
              Ordenar
            </label>
            <select
              value={listState.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-ifedel-primary focus:ring-2 focus:ring-ifedel-primary"
            >
              <option value="name_asc">Nombre A-Z</option>
              <option value="name_desc">Nombre Z-A</option>
              <option value="price_asc">Precio Menor</option>
              <option value="price_desc">Precio Mayor</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard
          title="Resultados"
          description="Estamos cargando el catálogo con los filtros aplicados."
        >
          <div className="py-8 text-center text-sm text-gray-600">
            Cargando...
          </div>
        </SectionCard>
      ) : products.length === 0 ? (
        <SectionCard
          title="Resultados"
          description="No se encontraron productos con los filtros actuales."
        >
          <p className="text-sm text-gray-600">
            Probá ampliando la búsqueda o limpiando los filtros para ver más
            productos disponibles.
          </p>
        </SectionCard>
      ) : (
        <SectionCard
          title="Resultados"
          description={`Mostrando ${products.length} de ${paginationMeta.total} productos.`}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const hasPrice = product.prices.length > 0
              const mainPrice = hasPrice ? product.prices[0] : null
              const qty = getQtyForProduct(product.id)

              const handleAddToQuote = () => {
                if (!hasPrice || !mainPrice) return
                addItem(
                  {
                    productId: product.id,
                    sku: product.sku,
                    title: product.title,
                    unitPriceUSD: mainPrice.netPrice,
                    taxRate: mainPrice.taxRate ?? 0,
                    imageUrl: product.images[0]?.url,
                  },
                  qty > 0 ? qty : 1,
                )
              }

              const handleQtyChange = (newQty: number) => {
                if (newQty <= 0) {
                  removeItem(product.id)
                } else if (qty === 0 && hasPrice && mainPrice) {
                  addItem(
                    {
                      productId: product.id,
                      sku: product.sku,
                      title: product.title,
                      unitPriceUSD: mainPrice.netPrice,
                      taxRate: mainPrice.taxRate ?? 0,
                      imageUrl: product.images[0]?.url,
                    },
                    newQty,
                  )
                } else {
                  updateQty(product.id, newQty)
                }
              }

              return (
                <div
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow transition hover:border-ifedel-primary hover:shadow-lg"
                >
                  <Link href={productDetailHref(product.id)} className="block">
                    {product.images.length > 0 && (
                      <div className="aspect-square bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getOptimizedImageUrl(product.images[0]?.url, 400)}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="text-sm text-gray-500">
                      {product.brand.name} • {product.category.name}
                    </div>
                    <Link href={productDetailHref(product.id)} className="block">
                      <h3 className="mb-1 line-clamp-2 font-semibold">
                        {product.title}
                      </h3>
                    </Link>
                    {product.short && (
                      <p className="mb-1 line-clamp-2 text-sm text-gray-600">
                        {product.short}
                      </p>
                    )}
                    <div className="text-lg font-bold text-ifedel-primary">
                      {getDisplayPrice(product) || 'Sin precio'}
                    </div>
                    {exchangeRate?.usdArsRate &&
                      hasPrice &&
                      mainPrice?.currency === 'USD' && (
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const p = mainPrice
                            const taxRate = p.taxRate ?? 0
                            const totalUsd = p.netPrice * (1 + taxRate / 100)
                            const totalArs =
                              totalUsd * exchangeRate.usdArsRate!
                            return `≈ ${formatCurrency(
                              totalArs,
                              'ARS',
                            )} (al tipo de cambio ${
                              exchangeRate.usdArsRate
                            } ARS/USD)`
                          })()}
                        </div>
                      )}
                    <div className="text-xs text-gray-400">
                      SKU: {product.sku}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded border text-sm disabled:opacity-50"
                          disabled={qty <= 0}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={qty}
                          onChange={(e) =>
                            handleQtyChange(
                              Math.max(
                                0,
                                parseInt(e.target.value || '0', 10),
                              ),
                            )
                          }
                          className="h-7 w-12 rounded border text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(qty + 1 || 1)}
                          className="flex h-7 w-7 items-center justify-center rounded border text-sm"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddToQuote}
                        disabled={!hasPrice}
                        className="flex-1 rounded-md bg-ifedel-primary px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {qty > 0
                          ? 'Actualizar cotización'
                          : 'Agregar a cotización'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {paginationMeta.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => goToPage(listState.page - 1)}
                disabled={listState.page === 1}
                className="rounded border border-ifedel-primary px-4 py-2 text-ifedel-primary transition hover:bg-ifedel-primary hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-500 disabled:hover:bg-transparent"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {listState.page} de {paginationMeta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(listState.page + 1)}
                disabled={listState.page >= paginationMeta.totalPages}
                className="rounded border border-ifedel-primary px-4 py-2 text-ifedel-primary transition hover:bg-ifedel-primary hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-500 disabled:hover:bg-transparent"
              >
                Siguiente
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {totalItems > 0 && (
        <Link
          href="/quotes/new"
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-ifedel-primary px-4 py-3 text-sm font-medium text-white shadow-lg hover:opacity-90 md:text-base"
        >
          Ver cotización ({totalItems})
        </Link>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Catálogo de productos"
            description="Explorá el catálogo y armá cotizaciones rápidas a partir de los productos disponibles."
          />
          <SectionCard title="Resultados" description="Cargando…">
            <div className="py-8 text-center text-sm text-gray-600">
              Cargando...
            </div>
          </SectionCard>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  )
}
