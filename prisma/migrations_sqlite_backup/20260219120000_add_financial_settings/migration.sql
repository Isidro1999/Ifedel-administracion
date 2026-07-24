-- CreateTable
CREATE TABLE "financial_settings" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "ingresosBrutosRate" REAL NOT NULL DEFAULT 0,
  "bankCreditRate" REAL NOT NULL DEFAULT 0,
  "bankDebitRate" REAL NOT NULL DEFAULT 0,
  "fixedMonthlyOverheadARS" REAL NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
