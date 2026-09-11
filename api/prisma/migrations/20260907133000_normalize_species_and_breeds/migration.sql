-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "enName" TEXT NOT NULL,
    "huName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_enName_key" ON "species"("enName");

-- Seed canonical species from existing listing and breed data.
INSERT INTO "species" ("id", "enName", "huName")
SELECT md5('floofs-species:' || lower(source."species")), source."species", source."species"
FROM (
    SELECT DISTINCT "species" FROM "pets"
    UNION
    SELECT DISTINCT "species" FROM "breeds"
) AS source
WHERE source."species" IS NOT NULL
ON CONFLICT ("enName") DO NOTHING;

-- AlterTable
ALTER TABLE "pets" ADD COLUMN "speciesId" TEXT;
ALTER TABLE "breeds" ADD COLUMN "enName" TEXT;
ALTER TABLE "breeds" ADD COLUMN "huName" TEXT;
ALTER TABLE "breeds" ADD COLUMN "speciesId" TEXT;

-- Backfill localized breed columns and relations.
UPDATE "breeds" SET "enName" = "name", "huName" = "name";
UPDATE "breeds" SET "speciesId" = "species"."id"
FROM "species" WHERE lower("breeds"."species") = lower("species"."enName");
UPDATE "pets" SET "speciesId" = "species"."id"
FROM "species" WHERE lower("pets"."species") = lower("species"."enName");

-- Replace legacy Breed uniqueness with normalized relation.
DROP INDEX "breeds_species_name_key";
ALTER TABLE "breeds" ALTER COLUMN "enName" SET NOT NULL;
ALTER TABLE "breeds" ALTER COLUMN "huName" SET NOT NULL;
ALTER TABLE "breeds" ALTER COLUMN "speciesId" SET NOT NULL;
ALTER TABLE "breeds" DROP COLUMN "name";
ALTER TABLE "breeds" DROP COLUMN "species";

-- CreateIndex
CREATE UNIQUE INDEX "breeds_speciesId_enName_key" ON "breeds"("speciesId", "enName");
CREATE INDEX "breeds_enName_idx" ON "breeds"("enName");
CREATE INDEX "breeds_speciesId_idx" ON "breeds"("speciesId");
CREATE INDEX "pets_speciesId_idx" ON "pets"("speciesId");

-- AddForeignKey
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pets" ADD CONSTRAINT "pets_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE SET NULL ON UPDATE CASCADE;