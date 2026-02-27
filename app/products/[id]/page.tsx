'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/products" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Volver al catálogo
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Imágenes */}
            <div>
              {sortedImages.length > 0 ? (
                <>
                  <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    <img
                      src={sortedImages[selectedImageIndex]?.url || sortedImages[0].url}
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
                            src={img.url}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
