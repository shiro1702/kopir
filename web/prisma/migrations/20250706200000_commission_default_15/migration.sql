-- New points default to 15% platform commission (pilot points keep existing values).
ALTER TABLE "Point" ALTER COLUMN "commissionPercent" SET DEFAULT 15;
