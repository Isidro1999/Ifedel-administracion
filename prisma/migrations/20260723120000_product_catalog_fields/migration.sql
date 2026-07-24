-- Etapa 1 catálogo: campos públicos de producto + backfill de slug
-- No rompe productos existentes: slug se genera desde title/sku y se desambigua.

-- 1) Columnas nuevas (slug nullable hasta backfill)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "catalogVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "publicTitle" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "publicShortDescription" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "publicDescription" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "catalogSort" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "showPrice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "catalogPriceList" TEXT;

-- 2) Backfill de slug desde title (fallback sku), normalizado
UPDATE "products"
SET "slug" = trim(both '-' from lower(
  regexp_replace(
    regexp_replace(
      coalesce(nullif(trim("title"), ''), nullif(trim("sku"), ''), 'producto'),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    ),
    '(^-|-$)',
    '',
    'g'
  )
))
WHERE "slug" IS NULL OR trim("slug") = '';

-- Slugs vacíos tras normalización → product-{id}
UPDATE "products"
SET "slug" = 'producto-' || "id"::text
WHERE "slug" IS NULL OR trim("slug") = '';

-- 3) Desambiguar colisiones: conservar el de menor id, sufijar el resto con -{id}
WITH dups AS (
  SELECT
    "id",
    "slug",
    ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "id" ASC) AS rn
  FROM "products"
)
UPDATE "products" p
SET "slug" = p."slug" || '-' || p."id"::text
FROM dups d
WHERE p."id" = d."id"
  AND d.rn > 1;

-- Por si el sufijo colisiona otra vez (muy raro), forzar producto-{id}
WITH still_dups AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "id" ASC) AS rn
  FROM "products"
)
UPDATE "products" p
SET "slug" = 'producto-' || p."id"::text
FROM still_dups s
WHERE p."id" = s."id"
  AND s.rn > 1;

-- 4) NOT NULL + UNIQUE
ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_key" ON "products"("slug");

-- 5) Índice para listados de catálogo
CREATE INDEX IF NOT EXISTS "products_catalogVisible_catalogSort_idx"
  ON "products"("catalogVisible", "catalogSort");
