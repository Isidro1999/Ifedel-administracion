-- AlterTable
ALTER TABLE "products" ADD COLUMN "cost" REAL;
ALTER TABLE "products" ADD COLUMN "costCurrency" TEXT DEFAULT 'USD';
