-- Performance 1: índices de lectura para catálogo público.
-- Solo CREATE INDEX — no modifica datos ni publica productos.

CREATE INDEX IF NOT EXISTS "products_catalogVisible_isActive_catalogSort_idx"
  ON "products"("catalogVisible", "isActive", "catalogSort");

CREATE INDEX IF NOT EXISTS "products_catalogVisible_isActive_isFeatured_idx"
  ON "products"("catalogVisible", "isActive", "isFeatured");

CREATE INDEX IF NOT EXISTS "products_catalogVisible_isActive_categoryId_idx"
  ON "products"("catalogVisible", "isActive", "categoryId");

CREATE INDEX IF NOT EXISTS "products_catalogVisible_isActive_brandId_idx"
  ON "products"("catalogVisible", "isActive", "brandId");

CREATE INDEX IF NOT EXISTS "products_catalogVisible_isActive_isFeatured_catalogSort_idx"
  ON "products"("catalogVisible", "isActive", "isFeatured", "catalogSort");
