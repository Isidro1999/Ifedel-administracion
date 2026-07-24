import Link from 'next/link'
import { headers } from 'next/headers'
import { catalogPath } from '@/lib/catalog-paths'

export default function CatalogoNotFound() {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const productosHref = catalogPath('productos', onCatalogHost)

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900">No encontrado</h1>
      <p className="mt-3 text-sm text-slate-600">
        El producto o la categoría que buscás no está disponible en el catálogo
        público.
      </p>
      <Link
        href={productosHref}
        className="mt-8 inline-flex rounded-full bg-ifedel-primary px-5 py-2.5 text-sm font-semibold text-black"
      >
        Ver productos
      </Link>
    </div>
  )
}
