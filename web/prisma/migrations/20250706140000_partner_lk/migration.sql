-- prisma-migrate-disable-transaction
-- CreateEnum
CREATE TYPE "PartnerBalanceEntryType" AS ENUM ('CREDIT', 'PAYOUT');

-- AlterEnum
ALTER TYPE "BindTokenPurpose" ADD VALUE 'partner';

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT,
    "maxUserId" BIGINT,
    "name" TEXT,
    "requisites" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBalanceEntry" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amountKopeks" INTEGER NOT NULL,
    "type" "PartnerBalanceEntryType" NOT NULL,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerBalanceEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Point" ADD COLUMN "commissionPercent" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "partnerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Partner_telegramId_key" ON "Partner"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_maxUserId_key" ON "Partner"("maxUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBalanceEntry_batchId_key" ON "PartnerBalanceEntry"("batchId");

-- CreateIndex
CREATE INDEX "PartnerBalanceEntry_partnerId_createdAt_idx" ON "PartnerBalanceEntry"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "Point_partnerId_idx" ON "Point"("partnerId");

-- AddForeignKey
ALTER TABLE "Point" ADD CONSTRAINT "Point_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBalanceEntry" ADD CONSTRAINT "PartnerBalanceEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
