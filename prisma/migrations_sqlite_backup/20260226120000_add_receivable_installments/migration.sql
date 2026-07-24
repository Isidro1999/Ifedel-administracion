-- CreateTable
CREATE TABLE "receivable_installments" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "receivableId" INTEGER NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "dueDate" DATETIME NOT NULL,
  "amount" REAL NOT NULL,
  "amountPaid" REAL NOT NULL DEFAULT 0,
  "balance" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "label" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receivable_installments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "receivable_installments_receivableId_idx" ON "receivable_installments"("receivableId");
CREATE INDEX "receivable_installments_dueDate_idx" ON "receivable_installments"("dueDate");
CREATE INDEX "receivable_installments_status_idx" ON "receivable_installments"("status");
