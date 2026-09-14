CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "NotificationEventType" AS ENUM ('GRADING_CREATED', 'GRADING_CANCELLED', 'SEED_BILL_CREATED', 'SEED_BILL_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_REVERSED', 'DUE_REMINDER');
ALTER TABLE "customers" ADD COLUMN "sms_consent" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "whatsapp_consent" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "customer_id" UUID NOT NULL, "channel" "NotificationChannel" NOT NULL,
  "event_type" "NotificationEventType" NOT NULL, "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" VARCHAR(13) NOT NULL, "template_key" VARCHAR(100) NOT NULL, "variables" JSONB NOT NULL,
  "message_preview" VARCHAR(500) NOT NULL, "grading_entry_id" UUID, "seed_bill_id" UUID, "payment_id" UUID,
  "created_by_id" UUID NOT NULL, "provider_message_id" VARCHAR(150), "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" VARCHAR(500), "sent_at" TIMESTAMPTZ(3), "delivered_at" TIMESTAMPTZ(3), "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "notifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");
CREATE INDEX "notifications_customer_id_created_at_idx" ON "notifications"("customer_id", "created_at");
CREATE INDEX "notifications_grading_entry_id_idx" ON "notifications"("grading_entry_id");
CREATE INDEX "notifications_seed_bill_id_idx" ON "notifications"("seed_bill_id");
CREATE INDEX "notifications_payment_id_idx" ON "notifications"("payment_id");
