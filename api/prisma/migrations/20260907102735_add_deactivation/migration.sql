-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profilePictureUrl" TEXT;

-- CreateTable
CREATE TABLE "user_deactivations" (
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "deactivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_deactivations_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_deactivations" ADD CONSTRAINT "user_deactivations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
