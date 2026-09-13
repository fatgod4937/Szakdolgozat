-- AlterTable
ALTER TABLE "pets" ADD COLUMN "city" TEXT;
ALTER TABLE "pets" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "pets" ADD COLUMN "longitude" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "pets_latitude_longitude_idx" ON "pets"("latitude", "longitude");