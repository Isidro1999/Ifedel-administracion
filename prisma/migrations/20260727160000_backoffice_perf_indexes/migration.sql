-- Performance 2A: índices de lectura para backoffice.
-- Solo CREATE INDEX — no modifica datos ni relaciones.

CREATE INDEX IF NOT EXISTS "quotes_createdAt_idx"
  ON "quotes"("createdAt");

CREATE INDEX IF NOT EXISTS "sales_createdAt_idx"
  ON "sales"("createdAt");

CREATE INDEX IF NOT EXISTS "sales_status_issuedAt_idx"
  ON "sales"("status", "issuedAt");

CREATE INDEX IF NOT EXISTS "purchases_issuedAt_idx"
  ON "purchases"("issuedAt");

CREATE INDEX IF NOT EXISTS "product_prices_productId_priceList_createdAt_idx"
  ON "product_prices"("productId", "priceList", "createdAt");

CREATE INDEX IF NOT EXISTS "receivable_installments_status_dueDate_idx"
  ON "receivable_installments"("status", "dueDate");
