ALTER TABLE "shelters"
  DROP COLUMN "donationIban",
  DROP COLUMN "paypalDonationUrl",
  DROP COLUMN "donationUrl",
  DROP COLUMN "donationUrlLabel",
  ADD COLUMN "stripeAccountId" TEXT,
  ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "shelters_stripeAccountId_key" ON "shelters"("stripeAccountId");

CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED');

CREATE TABLE "donations" (
  "id" TEXT NOT NULL,
  "shelterId" TEXT NOT NULL,
  "donorId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "platformFee" INTEGER NOT NULL DEFAULT 0,
  "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "stripeSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "donations_stripeSessionId_key" ON "donations"("stripeSessionId");
CREATE INDEX "donations_shelterId_status_createdAt_idx" ON "donations"("shelterId", "status", "createdAt");
CREATE INDEX "donations_donorId_idx" ON "donations"("donorId");

ALTER TABLE "donations"
  ADD CONSTRAINT "donations_shelterId_fkey"
  FOREIGN KEY ("shelterId") REFERENCES "shelters"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "donations"
  ADD CONSTRAINT "donations_donorId_fkey"
  FOREIGN KEY ("donorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
