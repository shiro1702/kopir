-- Point picker: geo, schedule, content fields
ALTER TABLE "Point" ADD COLUMN "citySlug" TEXT NOT NULL DEFAULT 'ulan-ude';
ALTER TABLE "Point" ADD COLUMN "address" TEXT;
ALTER TABLE "Point" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "Point" ADD COLUMN "lng" DOUBLE PRECISION;
ALTER TABLE "Point" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Irkutsk';
ALTER TABLE "Point" ADD COLUMN "openingHours" JSONB;
ALTER TABLE "Point" ADD COLUMN "acceptsOnlineOrders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Point" ADD COLUMN "pickupInstructions" TEXT;
ALTER TABLE "Point" ADD COLUMN "estimatedReadyMinutes" TEXT;
ALTER TABLE "Point" ADD COLUMN "entryPhotoUrl" TEXT;

CREATE INDEX "Point_citySlug_isActive_idx" ON "Point"("citySlug", "isActive");
