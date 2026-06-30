-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'TBANK_ONLINE';

-- CreateEnum
CREATE TYPE "MessengerPlatform" AS ENUM ('telegram', 'max');
CREATE TYPE "BindTokenPurpose" AS ENUM ('staff', 'agent');

-- AlterTable
ALTER TABLE "Point" ADD COLUMN "pricePerPageKopeks" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Point" ADD COLUMN "paymentMethodsEnabled" "PaymentMethod"[] DEFAULT ARRAY['SBP_TRANSFER', 'ON_SITE']::"PaymentMethod"[];

-- CreateTable
CREATE TABLE "StaffChannel" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "platform" "MessengerPlatform" NOT NULL,
    "chatId" BIGINT,
    "userId" BIGINT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BindToken" (
    "token" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "purpose" "BindTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BindToken_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffChannel_pointId_platform_chatId_key" ON "StaffChannel"("pointId", "platform", "chatId");
CREATE UNIQUE INDEX "StaffChannel_pointId_platform_userId_key" ON "StaffChannel"("pointId", "platform", "userId");
CREATE INDEX "StaffChannel_pointId_isActive_idx" ON "StaffChannel"("pointId", "isActive");
CREATE INDEX "BindToken_pointId_purpose_idx" ON "BindToken"("pointId", "purpose");

-- AddForeignKey
ALTER TABLE "StaffChannel" ADD CONSTRAINT "StaffChannel_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BindToken" ADD CONSTRAINT "BindToken_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;
