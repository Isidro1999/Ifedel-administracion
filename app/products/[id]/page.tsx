'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'

interface Product {
  id: number
  sku: string
  title: string
  short: string | null
  description: string | null
  isActive: boolean
  isFeatured: boolean
  brand: { name: string; slug: string }
  category: { name: string; slug: string }
  images: Array<{ id: number; url: string; isPrimary: boolean; sortOrder: number }>
  specs: Array<{ id: number; label: string; value: string; sortOrder: number }>
  prices: Array<{
    id: number
    priceList: string
    currency: string
    netPrice: number
    taxRate: number
    validFrom: string | null
    validTo: string | null
  }>
  files: Array<{ id: number; type: string; url: string }>
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [adminKey, setAdminKey] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${params.id}`)
        if (!res.ok) {
          router.push('/products')
          return
        }
        const data: Product = await res.json()
        setProduct(data)
      } catch (error) {
        console.error('Error fetching product:', error)
        router.push('/products')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto text-center py-12">Cargando...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-gray-500 mb-4">Producto no encontrado</p>
          <Link href="/products" className="text-blue-600 hover:underline">
            Volver al catálogo
          </Link>
        </div>
      </div>
    )
  }

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0]
  const sortedImages = [...product.images].sort((a, b) => {
    if (a.isPrimary) return -1
    if (b.isPrimary) return 1
    return a.sortOrder - b.sortOrder
  })

  const getPriceWithTax = (netPrice: number, taxRate: number) => {
    return netPrice * (1 + taxRate / 100)
  }

  const handleDelete = async () => {
    if (!adminKey.trim()) {
      setDeleteError('Ingresá la clave de administrador')
      return
    }
    if (!confirm(`¿Eliminar el producto "${product.title}" (${product.sku})? Esta acción no se puede deshacer.`)) {
      return
    }
    setDeleteError('')
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al eliminar')
      }
      router.push('/products')
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar el producto')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/products" className="text-blue-600 hover:underline">
            ← Volver al catálogo
          </Link>
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Editar producto
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Imágenes */}
            <div>
              {sortedImages.length > 0 ? (
                <>
                  <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(
                        sortedImages[selectedImageIndex]?.url || sortedImages[0]?.url,
                        1200
                      )}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {sortedImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {sortedImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`aspect-square bg-gray-100 rounded overflow-hidden border-2 ${
                            selectedImageIndex === idx ? 'border-blue-500' : 'border-transparent'
                          }`}
                        >
                          <img
                            src={getOptimizedImageUrl(img.url, 400)}
                            alt={`${product.title} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  Sin imagen
                </div>
              )}
            </div>

            {/* Información */}
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-2">
                  {product.brand.name} • {product.category.name}
                </div>
                <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                {product.short && (
                  <p className="text-lg text-gray-600 mb-4">{product.short}</p>
                )}
                <div className="text-sm text-gray-400">SKU: {product.sku}</div>
              </div>

              {/* Precios */}
              {product.prices.length > 0 ? (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Precios</h2>
                  <div className="space-y-2">
                    {product.prices.map((price) => (
                      <div
                        key={price.id}
                        className="p-3 bg-gray-50 rounded border"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold">{price.priceList}</div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(price.netPrice, price.currency)} (neto)
                              {price.taxRate > 0 && (
                                <span className="ml-2">
                                  + {price.taxRate}% IVA ={' '}
                                  {formatCurrency(
                                    getPriceWithTax(price.netPrice, price.taxRate),
                                    price.currency
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {(price.validFrom || price.validTo) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {price.validFrom && `Desde: ${new Date(price.validFrom).toLocaleDateString()}`}
                            {price.validFrom && price.validTo && ' • '}
                            {price.validTo && `Hasta: ${new Date(price.validTo).toLocaleDateString()}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800">Este producto no tiene precios configurados</p>
                </div>
              )}

              {/* Especificaciones */}
              {product.specs.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Especificaciones</h2>
                  <dl className="space-y-2">
                    {product.specs.map((spec) => (
                      <div key={spec.id} className="flex border-b pb-2">
                        <dt className="font-medium w-1/3">{spec.label}</dt>
                        <dd className="text-gray-600 flex-1">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Descripción */}
              {product.description && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Descripción</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              {/* Archivos */}
              {product.files.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Archivos</h2>
                  <div className="space-y-2">
                    {product.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded border hover:bg-gray-100 transition"
                      >
                        <div className="font-medium">{file.type}</div>
                        <div className="text-sm text-gray-500">{file.url}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones de administrador */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-xl font-semibold mb-3 text-gray-700">Eliminar producto</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Para eliminar este producto ingresá la clave de administrador y confirmá.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Clave de administrador
                    </label>
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => {
                        setAdminKey(e.target.value)
                        setDeleteError('')
                      }}
                      placeholder="x-admin-key"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      disabled={deleting}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar producto'}
                  </button>
                </div>
                {deleteError && (
                  <p className="mt-2 text-sm text-red-600">{deleteError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
