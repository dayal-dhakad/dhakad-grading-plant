CREATE TABLE "payment_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "account_holder_name" VARCHAR(120) NOT NULL,
  "upi_id" VARCHAR(120) NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_accounts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "payment_accounts_upi_id_key" ON "payment_accounts"("upi_id");
CREATE INDEX "payment_accounts_is_active_idx" ON "payment_accounts"("is_active");
CREATE INDEX "payment_accounts_is_default_idx" ON "payment_accounts"("is_default");
CREATE UNIQUE INDEX "payment_accounts_one_default_idx" ON "payment_accounts"("is_default") WHERE "is_default" = true;

ALTER TABLE "grading_entries" ADD COLUMN "payment_account_id" UUID;
ALTER TABLE "customer_payments" ADD COLUMN "payment_account_id" UUID;
ALTER TABLE "seed_bills" ADD COLUMN "payment_account_id" UUID;
ALTER TABLE "grading_entries" ADD CONSTRAINT "grading_entries_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "payment_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "payment_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seed_bills" ADD CONSTRAINT "seed_bills_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "payment_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "grading_entries_payment_account_id_idx" ON "grading_entries"("payment_account_id");
CREATE INDEX "customer_payments_payment_account_id_idx" ON "customer_payments"("payment_account_id");
CREATE INDEX "seed_bills_payment_account_id_idx" ON "seed_bills"("payment_account_id");
