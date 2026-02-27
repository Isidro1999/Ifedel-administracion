'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

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

  return (
    <div className="min-h-screen p-8">
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
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                >
                  {product.images.length > 0 && (
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="text-sm text-gray-500 mb-1">
                      {product.brand.name} • {product.category.name}
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                    {product.short && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {product.short}
                      </p>
                    )}
                    <div className="text-lg font-bold text-blue-600">
                      {getDisplayPrice(product) || 'Sin precio'}
                    </div>
                    {exchangeRate?.usdArsRate &&
                      product.prices.length > 0 &&
                      product.prices[0].currency === 'USD' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const p = product.prices[0]
                            const totalUsd = p.netPrice * (1 + p.taxRate / 100)
                            const totalArs = totalUsd * exchangeRate.usdArsRate!
                            return `≈ ${formatCurrency(totalArs, 'ARS')} (al tipo de cambio ${exchangeRate.usdArsRate} ARS/USD)`
                          })()}
                        </div>
                      )}
                    <div className="text-xs text-gray-400 mt-1">SKU: {product.sku}</div>
                  </div>
                </Link>
              ))}
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
      </div>
    </div>
  )
}
