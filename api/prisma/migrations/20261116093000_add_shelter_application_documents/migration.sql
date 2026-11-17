CREATE TYPE "ShelterApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

ALTER TABLE "shelters"
  ADD COLUMN "applicationStatus" "ShelterApplicationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT;

CREATE TABLE "shelter_documents" (
  "id" TEXT NOT NULL,
  "shelterId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shelter_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shelter_documents_shelterId_idx" ON "shelter_documents"("shelterId");
ALTER TABLE "shelter_documents"
  ADD CONSTRAINT "shelter_documents_shelterId_fkey"
  FOREIGN KEY ("shelterId") REFERENCES "shelters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
