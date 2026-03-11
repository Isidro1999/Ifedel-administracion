-- CreateTable
CREATE TABLE "cash_movements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "occurredAt" DATETIME NOT NULL,
    "concept" TEXT NOT NULL,
    "category" TEXT,
    "receivablePaymentId" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_movements_receivablePaymentId_fkey" FOREIGN KEY ("receivablePaymentId") REFERENCES "receivable_payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "cash_movements_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_receivablePaymentId_key" ON "cash_movements"("receivablePaymentId");

-- CreateIndex
CREATE INDEX "cash_movements_type_idx" ON "cash_movements"("type");

-- CreateIndex
CREATE INDEX "cash_movements_occurredAt_idx" ON "cash_movements"("occurredAt");

-- CreateIndex
CREATE INDEX "cash_movements_category_idx" ON "cash_movements"("category");

-- CreateIndex
CREATE INDEX "cash_movements_createdByUserId_idx" ON "cash_movements"("createdByUserId");

