-- CreateTable
CREATE TABLE "breeds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "breeds_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "pets" ADD COLUMN "breedId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "breeds_species_name_key" ON "breeds"("species", "name");

-- CreateIndex
CREATE INDEX "breeds_name_idx" ON "breeds"("name");

-- CreateIndex
CREATE INDEX "pets_breedId_idx" ON "pets"("breedId");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_breedId_fkey" FOREIGN KEY ("breedId") REFERENCES "breeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;