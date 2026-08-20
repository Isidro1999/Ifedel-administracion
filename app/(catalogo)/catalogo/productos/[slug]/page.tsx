import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchCatalogProduct } from '@/lib/catalog-client'
import { catalogPath } from '@/lib/catalog-paths'
import {
  catalogCanonicalPath,
  catalogIndexFollowRobots,
} from '@/lib/catalog-seo'
import { ProductGallery } from '@/components/catalog/ProductGallery'
import { ProductDetailActions } from '@/components/catalog/ProductDetailActions'
import { CatalogPriceDisclaimer } from '@/components/catalog/CatalogPriceDisclaimer'
import { CatalogPriceDisplay } from '@/components/catalog/CatalogPriceDisplay'
import { IFEDelBrand } from '@/lib/ifedel-brand'

export const revalidate = 60

type PageProps = {
  params: { slug: string }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const product = await fetchCatalogProduct(params.slug)
    if (!product) {
      return { title: { absolute: `Producto | ${IFEDelBrand.companyName}` } }
    }
    return {
      title: { absolute: `${product.title} | IFEDEL` },
      description: product.shortDescription || undefined,
      robots: catalogIndexFollowRobots,
      alternates: {
        canonical: catalogCanonicalPath(`/productos/${product.slug}`),
      },
    }
  } catch {
    return { title: { absolute: `Producto | ${IFEDelBrand.companyName}` } }
  }
}

export default async function CatalogoProductoDetallePage({
  params,
}: PageProps) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)

  let product: Awaited<ReturnType<typeof fetchCatalogProduct>> = null
  try {
    product = await fetchCatalogProduct(params.slug)
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No pudimos cargar el producto</h1>
        <Link
          href={p('productos')}
          className="mt-6 inline-flex text-ifedel-brown hover:underline"
        >
          Volver al listado
        </Link>
      </div>
    )
  }

  if (!product) notFound()

  const primaryImage =
    product.images.find((i) => i.isPrimary)?.url ??
    product.images[0]?.url ??
    null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href={p()} className="hover:text-ifedel-brown">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href={p('productos')} className="hover:text-ifedel-brown">
          Productos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ifedel-brown">
            {product.brand?.name ?? 'Sin marca'}
            {product.category?.name ? ` · ${product.category.name}` : ''}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {product.title}
          </h1>

          {product.shortDescription ? (
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-6">
            <CatalogPriceDisplay
              amount={product.price?.amount ?? null}
              priceLabel={product.priceLabel}
              variant="detail"
            />
            {product.price ? (
              <CatalogPriceDisclaimer variant="detail" />
            ) : null}
          </div>

          <ProductDetailActions
            product={{
              productId: product.id,
              slug: product.slug,
              sku: product.sku,
              title: product.title,
              primaryImage,
            }}
          />

          {product.category?.slug ? (
            <Link
              href={p(`categorias/${product.category.slug}`)}
              className="mt-6 inline-block text-sm font-medium text-ifedel-brown hover:underline"
            >
              Ver más de {product.category.name}
            </Link>
          ) : null}
        </div>
      </div>

      {product.description ? (
        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl font-bold text-slate-900">Descripción</h2>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {product.description}
          </div>
        </section>
      ) : null}

      {product.specs.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Especificaciones</h2>
          <dl className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {product.specs.map((spec) => (
              <div
                key={spec.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4"
              >
                <dt className="text-sm font-medium text-slate-500">
                  {spec.label}
                </dt>
                <dd className="text-sm text-slate-900 sm:col-span-2">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {product.files.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Archivos</h2>
          <ul className="mt-4 space-y-2">
            {product.files.map((file) => (
              <li key={file.id}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-medium text-ifedel-brown hover:underline"
                >
                  {file.type} — abrir archivo
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
