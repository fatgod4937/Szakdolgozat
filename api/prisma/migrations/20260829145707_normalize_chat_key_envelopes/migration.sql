/*
  Warnings:

  - You are about to drop the column `keyEnvelopes` on the `chat_messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "keyEnvelopes";

-- CreateTable
CREATE TABLE "chat_message_key_envelopes" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,

    CONSTRAINT "chat_message_key_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_message_key_envelopes_deviceId_idx" ON "chat_message_key_envelopes"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_key_envelopes_messageId_deviceId_key" ON "chat_message_key_envelopes"("messageId", "deviceId");

-- AddForeignKey
ALTER TABLE "chat_message_key_envelopes" ADD CONSTRAINT "chat_message_key_envelopes_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_key_envelopes" ADD CONSTRAINT "chat_message_key_envelopes_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "chat_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
