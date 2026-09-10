CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ONLINE');
CREATE TYPE "GradingStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE "grading_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entry_number" SERIAL NOT NULL,
  "customer_id" UUID NOT NULL,
  "crop_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "rate" DECIMAL(12,2) NOT NULL,
  "calculated_amount" DECIMAL(12,2) NOT NULL,
  "paid_amount" DECIMAL(12,2) NOT NULL,
  "payment_method" "PaymentMethod" NOT NULL,
  "service_date" DATE NOT NULL,
  "notes" VARCHAR(500),
  "status" "GradingStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_id" UUID NOT NULL,
  "cancelled_at" TIMESTAMPTZ(3),
  "cancelled_by_id" UUID,
  "cancellation_reason" VARCHAR(300),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "grading_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grading_entries_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "grading_entries_rate_check" CHECK ("rate" >= 0),
  CONSTRAINT "grading_entries_amount_check" CHECK ("calculated_amount" >= 0 AND "paid_amount" >= 0 AND "paid_amount" <= "calculated_amount"),
  CONSTRAINT "grading_entries_cancellation_check" CHECK (("status" = 'ACTIVE' AND "cancelled_at" IS NULL AND "cancelled_by_id" IS NULL AND "cancellation_reason" IS NULL) OR ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "cancelled_by_id" IS NOT NULL AND "cancellation_reason" IS NOT NULL))
);
CREATE UNIQUE INDEX "grading_entries_entry_number_key" ON "grading_entries"("entry_number");
CREATE INDEX "grading_entries_customer_id_service_date_idx" ON "grading_entries"("customer_id", "service_date");
CREATE INDEX "grading_entries_crop_id_idx" ON "grading_entries"("crop_id");
CREATE INDEX "grading_entries_service_date_idx" ON "grading_entries"("service_date");
CREATE INDEX "grading_entries_status_idx" ON "grading_entries"("status");
ALTER TABLE "grading_entries" ADD CONSTRAINT "grading_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_entries" ADD CONSTRAINT "grading_entries_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_entries" ADD CONSTRAINT "grading_entries_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_entries" ADD CONSTRAINT "grading_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_entries" ADD CONSTRAINT "grading_entries_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
