-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastPointId" TEXT,
ADD COLUMN "preferredPointSlug" TEXT;

-- AlterTable
ALTER TABLE "Point" ADD COLUMN "displayCode" TEXT;

-- AlterTable
ALTER TABLE "OrderBatch" ALTER COLUMN "pointId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "pointId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Point_displayCode_key" ON "Point"("displayCode");

-- CreateIndex
CREATE INDEX "OrderBatch_userId_status_idx" ON "OrderBatch"("userId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastPointId_fkey" FOREIGN KEY ("lastPointId") REFERENCES "Point"("id") ON DELETE SET NULL ON UPDATE CASCADE;
