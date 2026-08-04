/**
 * TEMPORAL — Home oficial anterior (pre-promoción V2).
 * Solo para comparación y rollback rápido. No enlazada desde Header/Footer.
 * Eliminar esta ruta tras validar producción.
 */
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
} from '@/lib/catalog-client'
import { catalogPath } from '@/lib/catalog-paths'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'

/** ISR 60s: misma política que la home vigente. */
export const revalidate = 60

export const metadata: Metadata = {
  title: { absolute: 'Catálogo IFEDEL (legacy)' },
  description:
    'Catálogo online de productos y soluciones agropecuarias de IFEDEL.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function CatalogoHomeLegacyPage() {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)

  let categories: Awaited<ReturnType<typeof fetchCatalogCategories>> = []
  let featured: Awaited<ReturnType<typeof fetchCatalogProducts>>['items'] = []
  let loadError = false

  const featuredResult = await fetchCatalogProducts({
    featured: 'true',
    pageSize: '6',
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[catalogo/home] featured error', err)
      }
      return { ok: false as const, data: null }
    })

  const catsResult = await fetchCatalogCategories()
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[catalogo/home] categories error', err)
      }
      return {
        ok: false as const,
        data: [] as Awaited<ReturnType<typeof fetchCatalogCategories>>,
      }
    })

  if (featuredResult.ok) {
    featured = featuredResult.data.items
  } else {
    loadError = true
  }
  categories = catsResult.data

  return (
    <div>
      <section className="relative overflow-hidden bg-[#0a0a0a] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(141,198,64,0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(131,80,41,0.35), transparent 50%)',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ifedel-primary">
              {IFEDelBrand.companyName}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Catálogo de soluciones agropecuarias
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Explorá productos de {IFEDelBrand.companyName}, armá tu lista de
              consulta y contactanos. Sin compra online: te acompañamos por
              WhatsApp con la mejor atención comercial.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={p('productos')}
                className="inline-flex items-center justify-center rounded-full bg-ifedel-primary px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105"
              >
                Ver productos
              </Link>
              <Link
                href={p('consulta')}
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-ifedel-primary hover:text-ifedel-primary"
              >
                Armar consulta / WhatsApp
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
              <Image
                src={IFEDelBrand.logo.src}
                alt={IFEDelBrand.companyName}
                width={640}
                height={480}
                className="h-full w-full object-contain p-12"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6">
        {loadError ? (
          <EmptyCatalogState
            title="No pudimos cargar el catálogo"
            description="Hubo un problema al obtener los datos. Probá de nuevo en unos minutos."
            showCta={false}
          />
        ) : null}

        <section id="categorias">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Categorías
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Empezá por el rubro que te interesa.
              </p>
            </div>
            <Link
              href={p('productos')}
              className="hidden text-sm font-semibold text-ifedel-brown hover:underline sm:inline"
            >
              Ver todo
            </Link>
          </div>
          {categories.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-8 text-center text-sm text-slate-500">
              Aún no hay categorías con productos publicados.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={p(`categorias/${cat.slug}`)}
                  className="rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm transition hover:border-ifedel-primary/50 hover:shadow-md"
                >
                  <p className="font-semibold text-slate-900">{cat.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {cat.count ?? 0} producto{(cat.count ?? 0) === 1 ? '' : 's'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Productos destacados
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Selección comercial de {IFEDelBrand.companyName}.
            </p>
          </div>
          {featured.length === 0 ? (
            <EmptyCatalogState
              title="Sin destacados por ahora"
              description="Cuando publiquemos productos destacados van a aparecer acá. Mientras tanto podés explorar el catálogo completo."
            />
          ) : (
            <ProductGrid products={featured} />
          )}
          <div className="mt-8 text-center">
            <Link
              href={p('productos')}
              className="inline-flex rounded-full bg-ifedel-brown px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Ver todos los productos
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
