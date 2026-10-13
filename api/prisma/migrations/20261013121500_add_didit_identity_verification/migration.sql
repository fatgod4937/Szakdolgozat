-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'APPROVED',
    'DECLINED',
    'IN_REVIEW',
    'ABANDONED',
    'EXPIRED',
    'KYC_EXPIRED',
    'RESUBMITTED'
);

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "identityVerificationStatus" "IdentityVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN "diditSessionId" TEXT;

-- CreateTable
CREATE TABLE "didit_webhook_events" (
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT,
    "webhookType" TEXT NOT NULL,
    "status" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "didit_webhook_events_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_diditSessionId_key" ON "users"("diditSessionId");

-- CreateIndex
CREATE INDEX "didit_webhook_events_sessionId_idx" ON "didit_webhook_events"("sessionId");
