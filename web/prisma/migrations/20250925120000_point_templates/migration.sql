-- Ready-made PDF templates per point (UX-16)
CREATE TABLE "PointTemplate" (
    "id" TEXT NOT NULL,
    "pointId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PointTemplate_pointId_isActive_sortOrder_idx" ON "PointTemplate"("pointId", "isActive", "sortOrder");

ALTER TABLE "PointTemplate" ADD CONSTRAINT "PointTemplate_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;
