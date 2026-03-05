/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `product_images` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "product_images" ADD COLUMN "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_images_publicId_key" ON "product_images"("publicId");
