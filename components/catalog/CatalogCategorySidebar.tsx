import Link from 'next/link'
import type { CatalogCategoryNode } from '@/lib/catalog-category-public'
import {
  buildCatalogProductosHref,
  resolveEffectiveCategoryRoot,
  type CatalogProductosState,
} from '@/lib/catalog-productos-url'
import { HomeCategoryIcon } from '@/components/catalog/home/HomeCategoryIcon'
import type { HomeCategoryIconKey } from '@/components/catalog/home/home-categories'

/** Icono opcional por slug de categoría principal V1. */
const ROOT_CATEGORY_ICONS: Record<string, HomeCategoryIconKey> = {
  'electrificacion-y-alambrados': 'fence',
  'identificacion-y-pesaje-animal': 'scale',
  'esquila-y-peladoras': 'shear',
  'manejo-ganadero': 'farm',
  agua: 'water',
  pasturas: 'farm',
}

type CatalogCategorySidebarProps = {
  tree: CatalogCategoryNode[]
  state: CatalogProductosState
  basePath: string
  contactHref: string
}

export function CatalogCategorySidebar({
  tree,
  state,
  basePath,
  contactHref,
}: CatalogCategorySidebarProps) {
  const effectiveRoot = resolveEffectiveCategoryRoot(state, tree)
  const selectedRoot = tree.find((r) => r.slug === effectiveRoot) ?? null

  return (
    <aside className="space-y-6">
      <nav aria-label="Categorías principales">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Categoría principal
        </h2>
        <ul className="mt-3 space-y-0.5">
          {tree.map((root) => {
            const active = effectiveRoot === root.slug
            const icon = ROOT_CATEGORY_ICONS[root.slug] ?? 'default'
            const href = buildCatalogProductosHref(basePath, state, {
              categoryRoot: root.slug,
              category: null,
              page: null,
            })

            return (
              <li key={root.id}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition ${
                    active
                      ? 'bg-ifedel-primary/15 font-semibold text-slate-900'
                      : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? 'bg-ifedel-primary/25 text-ifedel-brown'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                    aria-hidden
                  >
                    <HomeCategoryIcon name={icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{root.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-slate-500">
                    {root.count}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {selectedRoot ? (
        <nav aria-label="Subcategorías">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subcategorías
          </h2>
          <ul className="mt-3 space-y-0.5">
            <li>
              <Link
                href={buildCatalogProductosHref(basePath, state, {
                  categoryRoot: selectedRoot.slug,
                  category: null,
                  page: null,
                })}
                aria-current={!state.category ? 'page' : undefined}
                className={`block rounded-xl px-3 py-2 text-sm transition ${
                  !state.category
                    ? 'bg-ifedel-primary/15 font-semibold text-slate-900'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
              >
                Todas
              </Link>
            </li>
            {(selectedRoot.children ?? []).map((leaf) => {
              const active = state.category === leaf.slug
              const href = buildCatalogProductosHref(basePath, state, {
                categoryRoot: selectedRoot.slug,
                category: leaf.slug,
                page: null,
              })

              return (
                <li key={leaf.id}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-ifedel-primary/15 font-semibold text-slate-900'
                        : 'text-slate-700 hover:bg-white/80'
                    }`}
                  >
                    <span className="min-w-0 leading-snug">{leaf.name}</span>
                    <span className="shrink-0 tabular-nums text-xs text-slate-500">
                      {leaf.count}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}

      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          ¿No encontrás lo que buscás?
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Nuestro equipo puede asesorarte.
        </p>
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex rounded-full bg-ifedel-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-105"
        >
          Contactanos
        </a>
      </div>
    </aside>
  )
}
