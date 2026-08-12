-- CUIT/CUIL snapshot en consultas comerciales.
-- Nullable: consultas históricas no tienen taxId.

ALTER TABLE "commercial_inquiries"
ADD COLUMN "taxId" TEXT;
