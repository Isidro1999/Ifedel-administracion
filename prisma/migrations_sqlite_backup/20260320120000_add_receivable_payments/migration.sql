-- CreateTable
CREATE TABLE "receivable_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receivableId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receivable_payments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "receivable_payments_receivableId_idx" ON "receivable_payments"("receivableId");

-- CreateIndex
CREATE INDEX "receivable_payments_paidAt_idx" ON "receivable_payments"("paidAt");

-- CreateIndex
CREATE INDEX "receivable_payments_createdByUserId_idx" ON "receivable_payments"("createdByUserId");
