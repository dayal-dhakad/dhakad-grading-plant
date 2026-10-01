CREATE TABLE "workers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_number" SERIAL NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "mobile" VARCHAR(10),
  "notes" VARCHAR(500),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "workers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workers_mobile_format_check" CHECK ("mobile" IS NULL OR "mobile" ~ '^[0-9]{10}$')
);

CREATE TABLE "worker_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_number" SERIAL NOT NULL,
  "worker_id" UUID NOT NULL,
  "payment_date" DATE NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "payment_method" "PaymentMethod" NOT NULL,
  "notes" VARCHAR(500),
  "recorded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "worker_payments_positive_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "worker_payments_method_check" CHECK ("payment_method" IN ('CASH', 'ONLINE'))
);

CREATE UNIQUE INDEX "workers_worker_number_key" ON "workers"("worker_number");
CREATE INDEX "workers_name_idx" ON "workers"("name");
CREATE INDEX "workers_mobile_idx" ON "workers"("mobile");
CREATE INDEX "workers_is_active_idx" ON "workers"("is_active");
CREATE UNIQUE INDEX "worker_payments_payment_number_key" ON "worker_payments"("payment_number");
CREATE INDEX "worker_payments_worker_id_payment_date_idx" ON "worker_payments"("worker_id", "payment_date");
CREATE INDEX "worker_payments_recorded_by_id_idx" ON "worker_payments"("recorded_by_id");
ALTER TABLE "worker_payments" ADD CONSTRAINT "worker_payments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_payments" ADD CONSTRAINT "worker_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
