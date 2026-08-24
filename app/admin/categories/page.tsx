'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { btnPrimary, btnSecondary, btnSecondarySm } from '@/lib/ui-classes'
import { suggestCategorySlug } from '@/lib/admin-categories'

type CategoryNode = {
  id: number
  name: string
  slug: string
  parentId: number | null
  sortOrder: number
  shortDescription: string | null
  imageUrl: string | null
  showInHome: boolean
  isActive: boolean
  productCount: number
  childCount: number
}

type TreeRoot = CategoryNode & { children: CategoryNode[] }

type EditorState = {
  id?: number
  name: string
  slug: string
  parentId: number | null
  sortOrder: number
  shortDescription: string
  imageUrl: string
  showInHome: boolean
  isActive: boolean
  originalSlug?: string
}

const emptyEditor = (parentId: number | null = null): EditorState => ({
  name: '',
  slug: '',
  parentId,
  sortOrder: 0,
  shortDescription: '',
  imageUrl: '',
  showInHome: parentId == null,
  isActive: true,
})

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<TreeRoot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/categories', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'No se pudo cargar el árbol')
      }
      const data = await res.json()
      setTree(data.tree ?? [])
      const next: Record<number, boolean> = {}
      for (const r of data.tree ?? []) next[r.id] = true
      setExpanded(next)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const rootsOptions = useMemo(
    () => tree.map((r) => ({ id: r.id, name: r.name })),
    [tree]
  )

  const openCreateRoot = () => setEditor(emptyEditor(null))
  const openCreateChild = (parentId: number) => setEditor(emptyEditor(parentId))
  const openEdit = (node: CategoryNode) =>
    setEditor({
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      shortDescription: node.shortDescription ?? '',
      imageUrl: node.imageUrl ?? '',
      showInHome: node.showInHome,
      isActive: node.isActive,
      originalSlug: node.slug,
    })

  const onNameChange = (name: string) => {
    setEditor((prev) => {
      if (!prev) return prev
      const next = { ...prev, name }
      // Solo autogenerar slug en alta, no al editar
      if (!prev.id) {
        next.slug = suggestCategorySlug(name)
      }
      return next
    })
  }

  const save = async () => {
    if (!editor) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: editor.name,
        slug: editor.slug,
        parentId: editor.parentId,
        sortOrder: editor.sortOrder,
        shortDescription: editor.shortDescription || null,
        imageUrl: editor.imageUrl || null,
        showInHome: editor.showInHome,
        isActive: editor.isActive,
      }
      const res = await fetch(
        editor.id
          ? `/api/admin/categories/${editor.id}`
          : '/api/admin/categories',
        {
          method: editor.id ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Error al guardar')
      setEditor(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (node: CategoryNode) => {
    if (
      !confirm(
        `¿Eliminar "${node.name}"? Solo es posible si no tiene productos ni subcategorías.`
      )
    ) {
      return
    }
    setError('')
    try {
      const res = await fetch(`/api/admin/categories/${node.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'No se pudo eliminar')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  const slugChanged =
    editor?.id != null &&
    editor.originalSlug != null &&
    editor.slug !== editor.originalSlug

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Taxonomía jerárquica: Principal → Subcategoría. Las categorías legacy no se muestran aquí."
        actions={
          <button type="button" className={btnPrimary} onClick={openCreateRoot}>
            Nueva principal
          </button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {tree.length === 0 ? (
            <SectionCard title="Sin categorías administrables">
              <p className="text-sm text-slate-600">
                Todavía no hay principales V1. Creá la primera con “Nueva
                principal”.
              </p>
            </SectionCard>
          ) : (
            tree.map((root) => (
              <SectionCard
                key={root.id}
                title={root.name}
                description={`slug: ${root.slug} · orden ${root.sortOrder} · ${root.childCount} subcategorías · ${root.productCount} productos directos`}
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondarySm}
                    onClick={() =>
                      setExpanded((e) => ({
                        ...e,
                        [root.id]: !e[root.id],
                      }))
                    }
                  >
                    {expanded[root.id] ? 'Ocultar' : 'Expandir'}
                  </button>
                  <button
                    type="button"
                    className={btnSecondarySm}
                    onClick={() => openEdit(root)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={btnSecondarySm}
                    onClick={() => openCreateChild(root.id)}
                  >
                    + Subcategoría
                  </button>
                  <button
                    type="button"
                    className={btnSecondarySm}
                    onClick={() => void remove(root)}
                  >
                    Eliminar
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span
                    className={
                      root.isActive
                        ? 'rounded bg-emerald-50 px-2 py-0.5 text-emerald-800'
                        : 'rounded bg-slate-100 px-2 py-0.5'
                    }
                  >
                    {root.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                  {root.showInHome ? (
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-800">
                      Home
                    </span>
                  ) : null}
                </div>
                {expanded[root.id] ? (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {root.children.map((child) => (
                      <li
                        key={child.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {child.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {child.slug} · orden {child.sortOrder} ·{' '}
                            {child.productCount} productos ·{' '}
                            {child.isActive ? 'activa' : 'inactiva'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={btnSecondarySm}
                            onClick={() => openEdit(child)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={btnSecondarySm}
                            onClick={() => void remove(child)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                    {root.children.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-slate-500">
                        Sin subcategorías
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </SectionCard>
            ))
          )}
        </div>
      )}

      {editor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {editor.id
                ? 'Editar categoría'
                : editor.parentId
                  ? 'Nueva subcategoría'
                  : 'Nueva principal'}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nombre</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editor.name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Slug</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                  value={editor.slug}
                  onChange={(e) =>
                    setEditor({ ...editor, slug: e.target.value })
                  }
                />
              </label>
              {slugChanged ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Cambiar el slug puede afectar URLs públicas. Los redirects se
                  gestionarán en una etapa posterior.
                </p>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Padre</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editor.parentId ?? ''}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      parentId: e.target.value
                        ? Number(e.target.value)
                        : null,
                      showInHome: e.target.value
                        ? editor.showInHome
                        : editor.showInHome,
                    })
                  }
                >
                  <option value="">(Principal — sin padre)</option>
                  {rootsOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Orden</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editor.sortOrder}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      sortOrder: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Descripción corta
                </span>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  rows={3}
                  value={editor.shortDescription}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      shortDescription: e.target.value,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">imageUrl</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="https://…"
                  value={editor.imageUrl}
                  onChange={(e) =>
                    setEditor({ ...editor, imageUrl: e.target.value })
                  }
                />
              </label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editor.showInHome}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        showInHome: e.target.checked,
                      })
                    }
                  />
                  Mostrar en Home
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editor.isActive}
                    onChange={(e) =>
                      setEditor({ ...editor, isActive: e.target.checked })
                    }
                  />
                  Activa
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setEditor(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
