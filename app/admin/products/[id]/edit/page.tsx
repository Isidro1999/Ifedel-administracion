'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ImportProduct } from '@/lib/import-schemas'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'

interface ProductImage {
  id: number
  url: string
  isPrimary: boolean
  sortOrder: number
}

interface ProductFromApi {
  id: number
  sku: string
  title: string
  short: string | null
  description: string | null
  cost: number | null
  costCurrency: string | null
  isActive: boolean
  isFeatured: boolean
  brand: { name: string }
  category: { name: string }
  images: ProductImage[]
  specs: Array<{ label: string; value: string; sortOrder: number }>
  prices: Array<{
    priceList: string
    currency: string
    netPrice: number
    taxRate: number
    validFrom: string | null
    validTo: string | null
  }>
  files: Array<{ type: string; url: string }>
}

function productToForm(product: ProductFromApi): ImportProduct {
  // Las imágenes se gestionan por separado vía Cloudinary y endpoints dedicados.
  // Aquí solo mapeamos los campos del producto y relaciones que siguen el flujo ImportProduct.
  return {
    sku: product.sku,
    title: product.title,
    brand: product.brand.name,
    category: product.category.name,
    short: product.short ?? '',
    description: product.description ?? '',
    cost: product.cost ?? undefined,
    costCurrency: product.costCurrency ?? undefined,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    images: [],
    specs: product.specs.map((s) => ({
      label: s.label,
      value: s.value,
      sortOrder: s.sortOrder,
    })),
    prices: product.prices.map((p) => ({
      priceList: p.priceList,
      currency: p.currency,
      netPrice: p.netPrice,
      taxRate: p.taxRate,
      validFrom: p.validFrom ?? undefined,
      validTo: p.validTo ?? undefined,
    })),
    files: product.files.map((f) => ({ type: f.type, url: f.url })),
  }
}

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [form, setForm] = useState<ImportProduct | null>(null)
   const [images, setImages] = useState<ProductImage[]>([])
   const [uploadingImage, setUploadingImage] = useState(false)
   const [imageError, setImageError] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`)
        if (!res.ok) {
          setError('Producto no encontrado')
          setLoading(false)
          return
        }
        const data: ProductFromApi = await res.json()
        setForm(productToForm(data))
        setImages(
          data.images.slice().sort((a, b) => {
            if (a.isPrimary && !b.isPrimary) return -1
            if (!a.isPrimary && b.isPrimary) return 1
            return a.sortOrder - b.sortOrder
          })
        )
      } catch {
        setError('Error al cargar el producto')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProduct()
  }, [id])

  const update = (patch: Partial<ImportProduct>) => {
    if (form) setForm({ ...form, ...patch })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !adminKey.trim()) {
      setError(adminKey.trim() ? 'Completá los campos requeridos' : 'Ingresá la clave de administrador')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      router.push(`/products/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto text-center py-12">Cargando...</div>
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/products" className="text-blue-600 hover:underline">
            Volver al catálogo
          </Link>
        </div>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <Link href={`/products/${id}`} className="text-blue-600 hover:underline mb-4 inline-block">
          ← Volver al producto
        </Link>
        <h1 className="text-2xl font-bold mb-6">Editar producto</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Clave de administrador</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="x-admin-key"
              required
            />
          </div>

          <div className="bg-white rounded-lg border p-4 space-y-4">
            <h2 className="text-lg font-semibold">Datos básicos</h2>
            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => update({ sku: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Marca</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => update({ brand: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => update({ category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción corta</label>
              <input
                type="text"
                value={form.short ?? ''}
                onChange={(e) => update({ short: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => update({ description: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Costo</label>
                <input
                  type="number"
                  step="any"
                  value={form.cost ?? ''}
                  onChange={(e) =>
                    update({ cost: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Moneda del costo</label>
                <input
                  type="text"
                  value={form.costCurrency ?? ''}
                  onChange={(e) => update({ costCurrency: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update({ isActive: e.target.checked })}
                />
                <span className="text-sm">Activo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => update({ isFeatured: e.target.checked })}
                />
                <span className="text-sm">Destacado</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-lg font-semibold mb-3">Imágenes</h2>
            <p className="text-xs text-gray-500 mb-3">
              Las imágenes se suben a Cloudinary y se gestionan de forma independiente al resto de
              los campos del producto.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (!adminKey.trim()) {
                    setImageError('Ingresá la clave de administrador para subir imágenes')
                    e.target.value = ''
                    return
                  }
                  setImageError('')
                  setUploadingImage(true)
                  try {
                    const formData = new FormData()
                    formData.append('file', file)
                    const res = await fetch(`/api/admin/products/${id}/images`, {
                      method: 'POST',
                      headers: { 'x-admin-key': adminKey },
                      body: formData,
                    })
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}))
                      throw new Error(data.error || 'Error al subir imagen')
                    }
                    const newImage: ProductImage = await res.json()
                    setImages((prev) =>
                      [...prev, newImage].sort((a, b) => {
                        if (a.isPrimary && !b.isPrimary) return -1
                        if (!a.isPrimary && b.isPrimary) return 1
                        return a.sortOrder - b.sortOrder
                      })
                    )
                    e.target.value = ''
                  } catch (err) {
                    setImageError(
                      err instanceof Error ? err.message : 'Error al subir la imagen'
                    )
                  } finally {
                    setUploadingImage(false)
                  }
                }}
                className="text-sm"
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <span className="text-xs text-gray-500">Subiendo imagen...</span>
              )}
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-gray-500">Este producto no tiene imágenes.</p>
            ) : (
              <div className="space-y-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-3 border rounded-md p-2 bg-gray-50"
                  >
                    <div className="w-16 h-16 rounded bg-white overflow-hidden border">
                      <img
                        src={getOptimizedImageUrl(img.url, 400)}
                        alt={form.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-xs text-gray-600 break-all line-clamp-2">
                        {img.url}
                      </div>
                      {img.isPrimary && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded hover:bg-white"
                        disabled={img.isPrimary}
                        onClick={async () => {
                          if (!adminKey.trim()) {
                            setImageError('Ingresá la clave de administrador')
                            return
                          }
                          setImageError('')
                          try {
                            const res = await fetch(
                              `/api/admin/products/${id}/images/${img.id}`,
                              {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-key': adminKey,
                                },
                                body: JSON.stringify({ isPrimary: true }),
                              }
                            )
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}))
                              throw new Error(data.error || 'Error al actualizar imagen')
                            }
                            setImages((prev) =>
                              prev.map((i) => ({
                                ...i,
                                isPrimary: i.id === img.id,
                              }))
                            )
                          } catch (err) {
                            setImageError(
                              err instanceof Error
                                ? err.message
                                : 'Error al establecer imagen principal'
                            )
                          }
                        }}
                      >
                        Principal
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="px-1 text-xs border rounded hover:bg-white"
                          disabled={idx === 0}
                          onClick={async () => {
                            const newOrder = [...images]
                            ;[newOrder[idx - 1], newOrder[idx]] = [
                              newOrder[idx],
                              newOrder[idx - 1],
                            ]
                            // recalcular sortOrder 0..n y enviar PATCH
                            const withOrder = newOrder.map((img, index) => ({
                              ...img,
                              sortOrder: index,
                            }))
                            setImages(withOrder)
                            if (!adminKey.trim()) {
                              setImageError('Ingresá la clave de administrador')
                              return
                            }
                            try {
                              await Promise.all(
                                withOrder.map((i) =>
                                  fetch(
                                    `/api/admin/products/${id}/images/${i.id}`,
                                    {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-admin-key': adminKey,
                                      },
                                      body: JSON.stringify({ sortOrder: i.sortOrder }),
                                    }
                                  )
                                )
                              )
                            } catch (err) {
                              setImageError(
                                err instanceof Error
                                  ? err.message
                                  : 'Error al actualizar el orden de imágenes'
                              )
                            }
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-1 text-xs border rounded hover:bg-white"
                          disabled={idx === images.length - 1}
                          onClick={async () => {
                            const newOrder = [...images]
                            ;[newOrder[idx + 1], newOrder[idx]] = [
                              newOrder[idx],
                              newOrder[idx + 1],
                            ]
                            const withOrder = newOrder.map((img, index) => ({
                              ...img,
                              sortOrder: index,
                            }))
                            setImages(withOrder)
                            if (!adminKey.trim()) {
                              setImageError('Ingresá la clave de administrador')
                              return
                            }
                            try {
                              await Promise.all(
                                withOrder.map((i) =>
                                  fetch(
                                    `/api/admin/products/${id}/images/${i.id}`,
                                    {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-admin-key': adminKey,
                                      },
                                      body: JSON.stringify({ sortOrder: i.sortOrder }),
                                    }
                                  )
                                )
                              )
                            } catch (err) {
                              setImageError(
                                err instanceof Error
                                  ? err.message
                                  : 'Error al actualizar el orden de imágenes'
                              )
                            }
                          }}
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs text-red-600 hover:underline"
                        onClick={async () => {
                          if (!adminKey.trim()) {
                            setImageError('Ingresá la clave de administrador')
                            return
                          }
                          if (
                            !confirm(
                              '¿Eliminar esta imagen? Se eliminará también de Cloudinary.'
                            )
                          ) {
                            return
                          }
                          setImageError('')
                          try {
                            const res = await fetch(
                              `/api/admin/products/${id}/images/${img.id}`,
                              {
                                method: 'DELETE',
                                headers: { 'x-admin-key': adminKey },
                              }
                            )
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}))
                              throw new Error(data.error || 'Error al eliminar imagen')
                            }
                            setImages((prev) => prev.filter((i) => i.id !== img.id))
                          } catch (err) {
                            setImageError(
                              err instanceof Error
                                ? err.message
                                : 'Error al eliminar la imagen'
                            )
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {imageError && (
              <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {imageError}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-lg font-semibold mb-3">Especificaciones</h2>
            {form.specs.map((spec, idx) => (
              <div key={idx} className="flex gap-2 mb-2 flex-wrap">
                <input
                  type="text"
                  value={spec.label}
                  onChange={(e) => {
                    const next = [...form.specs]
                    next[idx] = { ...next[idx], label: e.target.value }
                    update({ specs: next })
                  }}
                  className="w-32 px-3 py-2 border rounded-md text-sm"
                  placeholder="Etiqueta"
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => {
                    const next = [...form.specs]
                    next[idx] = { ...next[idx], value: e.target.value }
                    update({ specs: next })
                  }}
                  className="flex-1 min-w-[120px] px-3 py-2 border rounded-md text-sm"
                  placeholder="Valor"
                />
                <button
                  type="button"
                  onClick={() => update({ specs: form.specs.filter((_, i) => i !== idx) })}
                  className="px-2 py-1 text-red-600 text-sm hover:underline"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update({
                  specs: [
                    ...form.specs,
                    { label: '', value: '', sortOrder: form.specs.length },
                  ],
                })
              }
              className="text-sm text-blue-600 hover:underline"
            >
              + Agregar especificación
            </button>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-lg font-semibold mb-3">Precios</h2>
            {form.prices.map((price, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={price.priceList}
                  onChange={(e) => {
                    const next = [...form.prices]
                    next[idx] = { ...next[idx], priceList: e.target.value }
                    update({ prices: next })
                  }}
                  className="px-3 py-2 border rounded-md text-sm"
                  placeholder="Lista"
                />
                <input
                  type="text"
                  value={price.currency}
                  onChange={(e) => {
                    const next = [...form.prices]
                    next[idx] = { ...next[idx], currency: e.target.value }
                    update({ prices: next })
                  }}
                  className="px-3 py-2 border rounded-md text-sm"
                  placeholder="Moneda"
                />
                <input
                  type="number"
                  step="any"
                  value={price.netPrice}
                  onChange={(e) => {
                    const next = [...form.prices]
                    next[idx] = { ...next[idx], netPrice: Number(e.target.value) }
                    update({ prices: next })
                  }}
                  className="px-3 py-2 border rounded-md text-sm"
                  placeholder="Precio neto"
                />
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    step="any"
                    value={price.taxRate}
                    onChange={(e) => {
                      const next = [...form.prices]
                      next[idx] = { ...next[idx], taxRate: Number(e.target.value) }
                      update({ prices: next })
                    }}
                    className="flex-1 min-w-0 px-3 py-2 border rounded-md text-sm"
                    placeholder="IVA %"
                  />
                  <button
                    type="button"
                    onClick={() => update({ prices: form.prices.filter((_, i) => i !== idx) })}
                    className="px-2 py-1 text-red-600 text-sm hover:underline shrink-0"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update({
                  prices: [
                    ...form.prices,
                    {
                      priceList: 'minorista',
                      currency: 'ARS',
                      netPrice: 0,
                      taxRate: 0,
                    },
                  ],
                })
              }
              className="text-sm text-blue-600 hover:underline"
            >
              + Agregar precio
            </button>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-lg font-semibold mb-3">Archivos</h2>
            {form.files.map((file, idx) => (
              <div key={idx} className="flex gap-2 mb-2 flex-wrap">
                <input
                  type="text"
                  value={file.type}
                  onChange={(e) => {
                    const next = [...form.files]
                    next[idx] = { ...next[idx], type: e.target.value }
                    update({ files: next })
                  }}
                  className="w-28 px-3 py-2 border rounded-md text-sm"
                  placeholder="Tipo"
                />
                <input
                  type="url"
                  value={file.url}
                  onChange={(e) => {
                    const next = [...form.files]
                    next[idx] = { ...next[idx], url: e.target.value }
                    update({ files: next })
                  }}
                  className="flex-1 min-w-[200px] px-3 py-2 border rounded-md text-sm"
                  placeholder="URL"
                />
                <button
                  type="button"
                  onClick={() => update({ files: form.files.filter((_, i) => i !== idx) })}
                  className="px-2 py-1 text-red-600 text-sm hover:underline"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update({ files: [...form.files, { type: 'manual', url: '' }] })
              }
              className="text-sm text-blue-600 hover:underline"
            >
              + Agregar archivo
            </button>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <Link
              href={`/products/${id}`}
              className="px-4 py-2 border rounded-md hover:bg-gray-50 inline-block"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
