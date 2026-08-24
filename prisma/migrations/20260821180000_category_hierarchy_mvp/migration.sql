-- P1: jerarquía Category (parentId) + campos MVP de identidad + Restrict en productos.
-- No toca filas de categorías ni productos existentes; solo schema.

-- 0) name deja de ser globalmente unique (jerarquía + convivencia con legacy).
--    slug sigue siendo el identificador público único.
DROP INDEX IF EXISTS "categories_name_key";

-- 1) Campos nuevos en categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "showInHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 2) Índice para consultas por padre
CREATE INDEX IF NOT EXISTS "categories_parentId_idx" ON "categories"("parentId");

-- 3) Self-relation Category → Category (Restrict: no borrar padre con hijos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parentId_fkey'
  ) THEN
    ALTER TABLE "categories"
      ADD CONSTRAINT "categories_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Product.category: Cascade → Restrict (no borrar categoría con productos)
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_categoryId_fkey";
ALTER TABLE "products"
  ADD CONSTRAINT "products_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
