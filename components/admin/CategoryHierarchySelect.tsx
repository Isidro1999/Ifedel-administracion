'use client'

import { useEffect, useMemo, useState } from 'react'

export type LeafOption = {
  id: number
  name: string
  slug: string
  parentId: number
  parentName: string
  parentSlug: string
}

type CategoryHierarchySelectProps = {
  categoryId: number | null | undefined
  onChange: (categoryId: number | null) => void
  disabled?: boolean
}

export function CategoryHierarchySelect({
  categoryId,
  onChange,
  disabled,
}: CategoryHierarchySelectProps) {
  const [leaves, setLeaves] = useState<LeafOption[]>([])
  const [loadError, setLoadError] = useState('')
  const [rootId, setRootId] = useState<number | ''>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/categories?view=leaves', {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('No se pudieron cargar subcategorías')
        const data = await res.json()
        if (!cancelled) setLeaves(data.leaves ?? [])
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const roots = useMemo(() => {
    const map = new Map<number, { id: number; name: string; slug: string }>()
    for (const leaf of leaves) {
      if (!map.has(leaf.parentId)) {
        map.set(leaf.parentId, {
          id: leaf.parentId,
          name: leaf.parentName,
          slug: leaf.parentSlug,
        })
      }
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'es')
    )
  }, [leaves])

  // Sincronizar root desde categoryId actual
  useEffect(() => {
    if (categoryId == null) return
    const leaf = leaves.find((l) => l.id === categoryId)
    if (leaf) setRootId(leaf.parentId)
  }, [categoryId, leaves])

  const childOptions = useMemo(() => {
    if (rootId === '') return []
    return leaves
      .filter((l) => l.parentId === rootId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [leaves, rootId])

  const selectClass =
    'w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-ifedel-primary focus:outline-none focus:ring-1 focus:ring-ifedel-primary'

  return (
    <div className="space-y-3">
      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : null}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Categoría principal
        </label>
        <select
          className={selectClass}
          disabled={disabled || leaves.length === 0}
          value={rootId === '' ? '' : String(rootId)}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : ''
            setRootId(next)
            onChange(null)
          }}
          required
        >
          <option value="">Seleccioná una principal…</option>
          {roots.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Subcategoría</label>
        <select
          className={selectClass}
          disabled={disabled || rootId === ''}
          value={categoryId != null ? String(categoryId) : ''}
          onChange={(e) => {
            const v = e.target.value
            onChange(v ? Number(v) : null)
          }}
          required
        >
          <option value="">
            {rootId === ''
              ? 'Primero elegí una principal'
              : 'Seleccioná una subcategoría…'}
          </option>
          {childOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Los productos solo pueden asignarse a subcategorías (hojas).
        </p>
      </div>
    </div>
  )
}
