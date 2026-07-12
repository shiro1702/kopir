-- AlterTable
ALTER TABLE "PartnerBalanceEntry" ADD COLUMN "pointId" TEXT;
ALTER TABLE "PartnerBalanceEntry" ALTER COLUMN "partnerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PartnerBalanceEntry_pointId_createdAt_idx" ON "PartnerBalanceEntry"("pointId", "createdAt");

-- AddForeignKey
ALTER TABLE "PartnerBalanceEntry" ADD CONSTRAINT "PartnerBalanceEntry_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBalanceEntry" ADD CONSTRAINT "PartnerBalanceEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OrderBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
