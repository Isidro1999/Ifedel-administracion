-- CreateTable
CREATE TABLE "payment_terms" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "isDefault" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "payment_term_installments" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "paymentTermId" INTEGER NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "offsetDays" INTEGER NOT NULL,
  "percentage" REAL NOT NULL,
  CONSTRAINT "payment_term_installments_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES "payment_terms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Seed basic payment terms
INSERT INTO "payment_terms" ("code", "label", "description", "isActive", "isDefault") VALUES
  ('CONTADO', 'Contado', 'Pago total al momento de la venta.', 1, 1),
  ('0-30', '0-30', '50% al contado, 50% a 30 días.', 1, 0),
  ('0-30-60', '0-30-60', 'Tres cuotas iguales a 0, 30 y 60 días.', 1, 0);

INSERT INTO "payment_term_installments" ("paymentTermId", "order", "offsetDays", "percentage")
SELECT id, 0, 0, 1.0 FROM "payment_terms" WHERE code = 'CONTADO';

INSERT INTO "payment_term_installments" ("paymentTermId", "order", "offsetDays", "percentage")
SELECT id, 0, 0, 0.5 FROM "payment_terms" WHERE code = '0-30';
INSERT INTO "payment_term_installments" ("paymentTermId", "order", "offsetDays", "percentage")
SELECT id, 1, 30, 0.5 FROM "payment_terms" WHERE code = '0-30';

INSERT INTO "payment_term_installments" ("paymentTermId", "order", "offsetDays", "percentage")
SELECT id, 0, 0, 0.3333 FROM "payment_terms" WHERE code = '0-30-60';
INSERT INTO "payment_term_installments" ("paymentTermId", "order", "offsetDays", "percentage")
SELECT id, 1, 30, 0.3333 FROM "payment_terms" WHERE code = '0-30-60';
INSERT INTO "payment_term_installments" ("paymentTermId", "order", "offsetDays", "percentage")
SELECT id, 2, 60, 0.3334 FROM "payment_terms" WHERE code = '0-30-60';
