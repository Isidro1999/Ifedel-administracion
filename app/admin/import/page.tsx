'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'

type ImportResult = {
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
    if (!selectedFile) return

    setFile(selectedFile)
    if (selectedFile.name.endsWith('.csv')) setFormat('csv')
    if (selectedFile.name.endsWith('.json')) setFormat('json')
    setResult(null)
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
        const error = await res.json().catch(() => ({}))
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
    <div className="space-y-6">
      <PageHeader
        title="Importar productos"
        description="Herramienta para importar o actualizar productos masivamente desde archivos JSON o CSV."
        actions={
          <Link
            href="/"
            className="text-sm font-medium text-ifedel-primary hover:underline"
          >
            Volver al inicio
          </Link>
        }
      />

      <SectionCard
        title="Cargar archivo de importacion"
        description="Selecciona el archivo, el formato y la clave de administrador para ejecutar la importacion."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Clave de Administrador
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Ingresa la clave de administrador"
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Formato del archivo
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                  className="h-4 w-4"
                />
                JSON
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                  className="h-4 w-4"
                />
                CSV
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Archivo</label>
            <input
              type="file"
              accept={format === 'json' ? '.json' : '.csv'}
              onChange={handleFileChange}
              className="w-full rounded-md border px-3 py-2"
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
            className="w-full rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Importar productos'}
          </button>
        </form>
      </SectionCard>

      {result && (
        <SectionCard
          title="Resultado de la importacion"
          description="Resumen de productos creados, actualizados y filas con error."
        >
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <div className="text-2xl font-bold text-green-600">{result.created}</div>
              <div className="text-sm text-green-700">Creados</div>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 p-4">
              <div className="text-2xl font-bold text-ifedel-primary">{result.updated}</div>
              <div className="text-sm text-ifedel-brown">Actualizados</div>
            </div>
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              <div className="text-sm text-red-700">Fallidos</div>
            </div>
          </div>

          {result.errors.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ifedel-black">Errores detectados</h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {result.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-red-200 bg-red-50 p-3 text-sm"
                  >
                    <div className="font-medium">
                      Fila {error.row} {error.sku && `(SKU: ${error.sku})`}
                    </div>
                    <div className="text-red-700">{error.message}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Importacion completada sin errores
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard
        title="Formato de archivo esperado"
        description="Resumen rapido de los campos obligatorios y opcionales para la importacion."
      >
        <p className="mb-4 text-sm text-gray-600">
          Consulta la documentacion completa en el archivo{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">README.md</code>{' '}
          del proyecto (seccion de importacion).
        </p>
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Campos requeridos:</strong> sku, title, brand, category
          </p>
          <p className="mb-2">
            <strong>Campos opcionales:</strong> short, description, images, specs, prices, files, isActive, isFeatured
          </p>
          <p>
            Los productos se identifican por SKU. Si un producto con el mismo SKU ya existe, se actualiza; de lo contrario, se crea uno nuevo.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
