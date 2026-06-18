-- CreateEnum
CREATE TYPE "OrderBatchStatus" AS ENUM ('COLLECTING', 'AWAITING_PAYMENT', 'PAID', 'COMPLETED', 'PARTIALLY_FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OrderBatch" (
    "id" TEXT NOT NULL,
    "status" "OrderBatchStatus" NOT NULL DEFAULT 'COLLECTING',
    "userId" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "totalAmountKopeks" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderBatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "batchId" TEXT,
ADD COLUMN "batchIndex" INTEGER;

-- CreateIndex
CREATE INDEX "OrderBatch_status_pointId_createdAt_idx" ON "OrderBatch"("status", "pointId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_batchId_batchIndex_idx" ON "Order"("batchId", "batchIndex");

-- AddForeignKey
ALTER TABLE "OrderBatch" ADD CONSTRAINT "OrderBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBatch" ADD CONSTRAINT "OrderBatch_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OrderBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
