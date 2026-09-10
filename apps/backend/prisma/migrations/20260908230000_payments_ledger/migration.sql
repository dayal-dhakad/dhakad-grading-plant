CREATE TYPE "PaymentStatus" AS ENUM ('ACTIVE', 'REVERSED');
CREATE TYPE "LedgerEntryType" AS ENUM ('GRADING_CHARGE','GRADING_PAYMENT','GRADING_ADJUSTMENT','CUSTOMER_PAYMENT','PAYMENT_REVERSAL','GRADING_REVERSAL');
CREATE TABLE "customer_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "receipt_number" SERIAL NOT NULL,
  "customer_id" UUID NOT NULL, "amount" DECIMAL(12,2) NOT NULL, "payment_method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'ACTIVE', "recorded_by_id" UUID NOT NULL,
  "reversed_at" TIMESTAMPTZ(3), "reversed_by_id" UUID, "reversal_reason" VARCHAR(300),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_payments_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "customer_payments_reversal_check" CHECK (("status"='ACTIVE' AND "reversed_at" IS NULL AND "reversed_by_id" IS NULL AND "reversal_reason" IS NULL) OR ("status"='REVERSED' AND "reversed_at" IS NOT NULL AND "reversed_by_id" IS NOT NULL AND "reversal_reason" IS NOT NULL))
);
CREATE TABLE "payment_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "payment_id" UUID NOT NULL, "grading_entry_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_allocations_amount_check" CHECK ("amount" > 0)
);
CREATE TABLE "customer_ledger_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "customer_id" UUID NOT NULL, "entry_type" "LedgerEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "grading_entry_id" UUID, "payment_id" UUID, "description" VARCHAR(300) NOT NULL,
  "created_by_id" UUID NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id"), CONSTRAINT "customer_ledger_entries_amount_check" CHECK ("amount" <> 0)
);
CREATE UNIQUE INDEX "customer_payments_receipt_number_key" ON "customer_payments"("receipt_number");
CREATE INDEX "customer_payments_customer_id_created_at_idx" ON "customer_payments"("customer_id","created_at");
CREATE INDEX "customer_payments_recorded_by_id_idx" ON "customer_payments"("recorded_by_id");
CREATE INDEX "customer_payments_status_idx" ON "customer_payments"("status");
CREATE UNIQUE INDEX "payment_allocations_payment_id_grading_entry_id_key" ON "payment_allocations"("payment_id","grading_entry_id");
CREATE INDEX "payment_allocations_grading_entry_id_idx" ON "payment_allocations"("grading_entry_id");
CREATE INDEX "customer_ledger_entries_customer_id_created_at_idx" ON "customer_ledger_entries"("customer_id","created_at");
CREATE INDEX "customer_ledger_entries_grading_entry_id_idx" ON "customer_ledger_entries"("grading_entry_id");
CREATE INDEX "customer_ledger_entries_payment_id_idx" ON "customer_ledger_entries"("payment_id");
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "customer_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_grading_entry_id_fkey" FOREIGN KEY ("grading_entry_id") REFERENCES "grading_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_grading_entry_id_fkey" FOREIGN KEY ("grading_entry_id") REFERENCES "grading_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "customer_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "customer_ledger_entries" ("customer_id","entry_type","amount","grading_entry_id","description","created_by_id","created_at")
SELECT "customer_id",'GRADING_CHARGE',"calculated_amount","id",'Opening grading charge',"created_by_id","created_at" FROM "grading_entries" WHERE "status"='ACTIVE';
INSERT INTO "customer_ledger_entries" ("customer_id","entry_type","amount","grading_entry_id","description","created_by_id","created_at")
SELECT "customer_id",'GRADING_PAYMENT',-"paid_amount","id",'Payment recorded with grading entry',"created_by_id","created_at" FROM "grading_entries" WHERE "status"='ACTIVE' AND "paid_amount">0;
