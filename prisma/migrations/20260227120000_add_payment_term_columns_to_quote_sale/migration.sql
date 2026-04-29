-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "paymentTermId" INTEGER;
ALTER TABLE "quotes" ADD COLUMN "paymentTermCodeSnapshot" TEXT;
ALTER TABLE "quotes" ADD COLUMN "paymentTermLabelSnapshot" TEXT;
ALTER TABLE "quotes" ADD COLUMN "paymentTermInstallmentsRaw" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "paymentTermId" INTEGER;
ALTER TABLE "sales" ADD COLUMN "paymentTermCodeSnapshot" TEXT;
ALTER TABLE "sales" ADD COLUMN "paymentTermLabelSnapshot" TEXT;
ALTER TABLE "sales" ADD COLUMN "paymentTermInstallmentsRaw" TEXT;
