-- Consultas comerciales del catálogo público (CommercialInquiry).
-- No destructivo: solo crea tablas/índices nuevos.

CREATE TABLE "commercial_inquiry_sequence" (
    "id" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "commercial_inquiry_sequence_pkey" PRIMARY KEY ("id")
);

INSERT INTO "commercial_inquiry_sequence" ("id", "nextValue") VALUES (1, 1);

CREATE TABLE "commercial_inquiries" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'CATALOG_WEB',
    "customerName" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "location" TEXT,
    "clientType" TEXT,
    "message" TEXT,
    "submitterIp" TEXT,
    "submitterUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_inquiries_referenceNumber_key" ON "commercial_inquiries"("referenceNumber");
CREATE INDEX "commercial_inquiries_status_createdAt_idx" ON "commercial_inquiries"("status", "createdAt");
CREATE INDEX "commercial_inquiries_createdAt_idx" ON "commercial_inquiries"("createdAt");

CREATE TABLE "commercial_inquiry_items" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "productId" INTEGER,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "comment" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_inquiry_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_inquiry_items_inquiryId_idx" ON "commercial_inquiry_items"("inquiryId");
CREATE INDEX "commercial_inquiry_items_productId_idx" ON "commercial_inquiry_items"("productId");

ALTER TABLE "commercial_inquiry_items"
  ADD CONSTRAINT "commercial_inquiry_items_inquiryId_fkey"
  FOREIGN KEY ("inquiryId") REFERENCES "commercial_inquiries"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commercial_inquiry_items"
  ADD CONSTRAINT "commercial_inquiry_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
