-- Datos de entrega + snapshots económicos de consultas comerciales.
-- No destructivo: columnas nuevas nullable. No toca Product / ProductPrice.

ALTER TABLE "commercial_inquiries"
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "deliveryCity" TEXT,
ADD COLUMN "deliveryProvince" TEXT,
ADD COLUMN "deliveryPostalCode" TEXT,
ADD COLUMN "deliveryNotes" TEXT,
ADD COLUMN "estimatedProductsTotalARS" INTEGER,
ADD COLUMN "pricedItemsCount" INTEGER,
ADD COLUMN "unpricedItemsCount" INTEGER;

ALTER TABLE "commercial_inquiry_items"
ADD COLUMN "unitPriceARS" INTEGER,
ADD COLUMN "subtotalARS" INTEGER;
