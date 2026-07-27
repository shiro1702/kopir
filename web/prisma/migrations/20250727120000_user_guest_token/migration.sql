-- AlterTable
ALTER TABLE "User" ADD COLUMN "guestToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_guestToken_key" ON "User"("guestToken");
