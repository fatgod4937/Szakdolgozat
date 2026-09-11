CREATE TABLE "chat_thread_read_receipts" (
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_thread_read_receipts_pkey" PRIMARY KEY ("threadId", "userId")
);

CREATE INDEX "chat_thread_read_receipts_userId_lastReadAt_idx"
    ON "chat_thread_read_receipts"("userId", "lastReadAt");

CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key"
    ON "push_subscriptions"("endpoint");

CREATE INDEX "push_subscriptions_userId_idx"
    ON "push_subscriptions"("userId");

ALTER TABLE "chat_thread_read_receipts"
    ADD CONSTRAINT "chat_thread_read_receipts_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_thread_read_receipts"
    ADD CONSTRAINT "chat_thread_read_receipts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;