-- CreateTable
CREATE TABLE "chat_key_backups" (
    "userId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_key_backups_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "chat_key_backups" ADD CONSTRAINT "chat_key_backups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
