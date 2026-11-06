CREATE TYPE "ProfileCommentTargetType" AS ENUM ('USER', 'SHELTER');
CREATE TYPE "ProfileCommentDisputeStatus" AS ENUM ('NONE', 'OPEN', 'RESOLVED');

ALTER TABLE "shelters" ADD COLUMN "ownerId" TEXT;
CREATE UNIQUE INDEX "shelters_ownerId_key" ON "shelters"("ownerId");
ALTER TABLE "shelters"
  ADD CONSTRAINT "shelters_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "profile_comments" (
  "id" TEXT NOT NULL,
  "targetType" "ProfileCommentTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "isRemoved" BOOLEAN NOT NULL DEFAULT false,
  "removedAt" TIMESTAMP(3),
  "removedById" TEXT,
  "disputeStatus" "ProfileCommentDisputeStatus" NOT NULL DEFAULT 'NONE',
  "disputeReason" TEXT,
  "disputedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "profile_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "profile_comments_targetType_targetId_createdAt_idx"
  ON "profile_comments"("targetType", "targetId", "createdAt");
CREATE INDEX "profile_comments_parentId_idx" ON "profile_comments"("parentId");
CREATE INDEX "profile_comments_disputeStatus_idx" ON "profile_comments"("disputeStatus");
ALTER TABLE "profile_comments"
  ADD CONSTRAINT "profile_comments_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_comments"
  ADD CONSTRAINT "profile_comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "profile_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
