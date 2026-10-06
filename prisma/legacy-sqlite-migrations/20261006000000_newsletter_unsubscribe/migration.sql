ALTER TABLE "Subscriber" ADD COLUMN "unsubscribeTokenHash" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN "unsubscribedAt" DATETIME;

CREATE UNIQUE INDEX "Subscriber_unsubscribeTokenHash_key" ON "Subscriber"("unsubscribeTokenHash");
