'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: Array<{
    row: number
    sku?: string
    message: string
  }>
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [adminKey, setAdminKey] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (selectedFile.name.endsWith('.csv')) {
        setFormat('csv')
      } else if (selectedFile.name.endsWith('.json')) {
        setFormat('json')
      }
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !adminKey) {
      alert('Por favor selecciona un archivo y proporciona la clave de administrador')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format)

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
        },
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al importar')
      }

      const data: ImportResult = await res.json()
      setResult(data)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-ifedel-primary hover:underline mb-4 inline-block font-medium">
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold mb-4">Importar Productos</h1>
          <p className="text-gray-600">
            Sube un archivo JSON o CSV para importar productos masivamente. Los productos se
            actualizarán si ya existen (por SKU) o se crearán si son nuevos.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Clave de Administrador
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Ingresa la clave de administrador"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Formato del archivo
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="json"
                    checked={format === 'json'}
                    onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                    className="mr-2"
                  />
                  JSON
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                    className="mr-2"
                  />
                  CSV
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Archivo
              </label>
              <input
                type="file"
                accept={format === 'json' ? '.json' : '.csv'}
                onChange={handleFileChange}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Archivo seleccionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !file || !adminKey}
              className="w-full bg-ifedel-primary text-white py-2 px-4 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Importando...' : 'Importar Productos'}
            </button>
          </form>
        </div>

        {/* Resultados */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Resultado de la Importación</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="text-2xl font-bold text-green-600">{result.created}</div>
                <div className="text-sm text-green-700">Creados</div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-2xl font-bold text-ifedel-primary">{result.updated}</div>
                <div className="text-sm text-ifedel-brown">Actualizados</div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-sm text-red-700">Fallidos</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Errores:</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {result.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50 border border-red-200 rounded text-sm"
                    >
                      <div className="font-medium">
                        Fila {error.row} {error.sku && `(SKU: ${error.sku})`}
                      </div>
                      <div className="text-red-700">{error.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                ✓ Importación completada sin errores
              </div>
            )}
          </div>
        )}

        {/* Información sobre formato */}
        <div className="bg-gray-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">Formato de Archivo</h3>
          <p className="text-sm text-gray-600 mb-4">
            Consulta la documentación completa en{' '}
            <Link href="/docs/import-format" className="text-ifedel-primary hover:underline">
              /docs/import-format.md
            </Link>
          </p>
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Campos requeridos:</strong> sku, title, brand, category
            </p>
            <p className="mb-2">
              <strong>Campos opcionales:</strong> short, description, images, specs, prices,
              files, isActive, isFeatured
            </p>
            <p>
              Los productos se identifican por SKU. Si un producto con el mismo SKU ya existe,
              se actualizará; de lo contrario, se creará uno nuevo.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
