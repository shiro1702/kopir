-- AlterEnum (order in enum does not affect app logic)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CALCULATING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CALCULATION_FAILED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "calculatedAt" TIMESTAMP(3);
