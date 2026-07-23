import type { CatalogProductListItem } from '@/lib/catalog-client'
import { ProductCard } from '@/components/catalog/ProductCard'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'

type ProductGridProps = {
  products: CatalogProductListItem[]
  emptyTitle?: string
  emptyDescription?: string
}

export function ProductGrid({
  products,
  emptyTitle,
  emptyDescription,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyCatalogState title={emptyTitle} description={emptyDescription} />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
