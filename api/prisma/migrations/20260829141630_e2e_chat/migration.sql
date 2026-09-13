-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "ciphertext" TEXT,
ADD COLUMN     "keyEnvelopes" JSONB,
ADD COLUMN     "nonce" TEXT,
ADD COLUMN     "senderDeviceId" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- CreateTable
CREATE TABLE "chat_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_devices_userId_idx" ON "chat_devices"("userId");

-- AddForeignKey
ALTER TABLE "chat_devices" ADD CONSTRAINT "chat_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
