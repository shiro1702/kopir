-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('SBP_TRANSFER', 'ON_SITE');

-- AlterTable
ALTER TABLE "Point" ADD COLUMN "transferPhone" TEXT,
ADD COLUMN "transferBankLabel" TEXT;

-- AlterTable
ALTER TABLE "OrderBatch" ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "paymentMethodAt" TIMESTAMP(3),
ADD COLUMN "paymentClaimedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "paymentMethodAt" TIMESTAMP(3),
ADD COLUMN "paymentClaimedAt" TIMESTAMP(3);
