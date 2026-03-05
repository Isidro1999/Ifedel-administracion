'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { useQuoteStore } from '@/lib/quote-store'

interface Product {
  id: number
  sku: string
  title: string
  short: string | null
  brand: { name: string }
  category: { name: string }
  images: Array<{ url: string; isPrimary: boolean }>
  prices: Array<{ netPrice: number; currency: string; priceList: string; taxRate: number }>
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [facets, setFacets] = useState<Facets>({ brands: [], categories: [] })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [exchangeRate, setExchangeRate] = useState<{
    usdArsRate: number | null
    updatedAt: string | null
  } | null>(null)
  const [filters, setFilters] = useState({
    q: '',
    brand: '',
    category: '',
    priceList: '',
    currency: '', // vacío = mostrar todos los productos (no filtrar por moneda)
    sort: 'name_asc',
  })

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sort: filters.sort,
        ...(filters.q && { q: filters.q }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.category && { category: filters.category }),
        ...(filters.priceList && { priceList: filters.priceList }),
        ...(filters.currency && { currency: filters.currency }),
      })

      const res = await fetch(`/api/products?${params}`)
      const data: ProductsResponse = await res.json()
      setProducts(data.items)
      setFacets(data.facets)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch('/api/settings/exchange-rate')
      if (!res.ok) return
      const data = (await res.json()) as { usdArsRate: number | null; updatedAt: string | null }
      setExchangeRate(data)
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [filters, pagination.page])

  useEffect(() => {
    fetchExchangeRate()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getDisplayPrice = (product: Product) => {
    if (product.prices.length === 0) return null
    const price = product.prices[0]
    return formatCurrency(price.netPrice * (1 + price.taxRate / 100), price.currency)
  }

  const { items, addItem, updateQty, removeItem } = useQuoteStore()

  const getQtyForProduct = (productId: number) =>
    items.find((i) => i.productId === productId)?.qty ?? 0

  const totalItems = items.reduce((acc, item) => acc + item.qty, 0)

  return (
    <div className="min-h-screen p-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold mb-4">Catálogo de Productos</h1>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Búsqueda</label>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Marca</label>
              <select
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
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
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
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
              <label className="block text-sm font-medium mb-1">Ordenar</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
                <option value="price_asc">Precio Menor</option>
                <option value="price_desc">Precio Mayor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron productos
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Mostrando {products.length} de {pagination.total} productos
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                      taxRate: mainPrice.taxRate,
                      imageUrl: product.images[0]?.url,
                    },
                    qty > 0 ? qty : 1
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
                        taxRate: mainPrice.taxRate,
                        imageUrl: product.images[0]?.url,
                      },
                      newQty
                    )
                  } else {
                    updateQty(product.id, newQty)
                  }
                }

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden flex flex-col"
                  >
                    <Link href={`/products/${product.id}`} className="block">
                      {product.images.length > 0 && (
                        <div className="aspect-square bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getOptimizedImageUrl(product.images[0]?.url, 400)}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </Link>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="text-sm text-gray-500">
                        {product.brand.name} • {product.category.name}
                      </div>
                      <Link href={`/products/${product.id}`} className="block">
                        <h3 className="font-semibold mb-1 line-clamp-2">
                          {product.title}
                        </h3>
                      </Link>
                      {product.short && (
                        <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                          {product.short}
                        </p>
                      )}
                      <div className="text-lg font-bold text-blue-600">
                        {getDisplayPrice(product) || 'Sin precio'}
                      </div>
                      {exchangeRate?.usdArsRate &&
                        hasPrice &&
                        mainPrice?.currency === 'USD' && (
                          <div className="text-xs text-gray-500">
                            {(() => {
                              const p = mainPrice
                              const totalUsd = p.netPrice * (1 + p.taxRate / 100)
                              const totalArs = totalUsd * exchangeRate.usdArsRate!
                              return `≈ ${formatCurrency(
                                totalArs,
                                'ARS'
                              )} (al tipo de cambio ${
                                exchangeRate.usdArsRate
                              } ARS/USD)`
                            })()}
                          </div>
                        )}
                      <div className="text-xs text-gray-400">SKU: {product.sku}</div>

                      {/* Controles de cotización */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(qty - 1)}
                            className="w-7 h-7 border rounded text-sm flex items-center justify-center disabled:opacity-50"
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
                                Math.max(0, parseInt(e.target.value || '0', 10))
                              )
                            }
                            className="w-12 text-center border rounded text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(qty + 1 || 1)}
                            className="w-7 h-7 border rounded text-sm flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddToQuote}
                          disabled={!hasPrice}
                          className="flex-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {qty > 0 ? 'Actualizar cotización' : 'Agregar a cotización'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="px-4 py-2">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
        {totalItems > 0 && (
          <Link
            href="/quotes/new"
            className="fixed bottom-6 right-6 px-4 py-3 rounded-full shadow-lg bg-blue-600 text-white text-sm md:text-base flex items-center gap-2 hover:bg-blue-700"
          >
            Ver cotización ({totalItems})
          </Link>
        )}
      </div>
    </div>
  )
}
