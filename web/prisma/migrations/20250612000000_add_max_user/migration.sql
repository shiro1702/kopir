-- AlterTable
ALTER TABLE "User" ALTER COLUMN "telegramId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "maxUserId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "User_maxUserId_key" ON "User"("maxUserId");
