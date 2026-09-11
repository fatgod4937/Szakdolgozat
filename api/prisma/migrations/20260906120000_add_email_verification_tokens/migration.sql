-- AlterTable
ALTER TABLE "users"
ADD COLUMN "emailVerificationTokenHash" TEXT,
ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationTokenHash_key" ON "users"("emailVerificationTokenHash");