ALTER TYPE "SeedStockMovementType" ADD VALUE 'SALE';
ALTER TYPE "SeedStockMovementType" ADD VALUE 'SALE_REVERSAL';
ALTER TYPE "LedgerEntryType" ADD VALUE 'SEED_SALE_CHARGE';
ALTER TYPE "LedgerEntryType" ADD VALUE 'SEED_SALE_PAYMENT';
ALTER TYPE "LedgerEntryType" ADD VALUE 'SEED_SALE_REVERSAL';
CREATE TYPE "SeedBillStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TABLE "seed_bills" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "bill_number" SERIAL UNIQUE, "customer_id" UUID NOT NULL,
 "gross_amount" DECIMAL(12,2) NOT NULL, "discount_amount" DECIMAL(12,2) NOT NULL, "net_amount" DECIMAL(12,2) NOT NULL,
 "paid_amount" DECIMAL(12,2) NOT NULL, "waived_amount" DECIMAL(12,2) NOT NULL DEFAULT 0, "payment_method" "PaymentMethod" NOT NULL,
 "status" "SeedBillStatus" NOT NULL DEFAULT 'ACTIVE', "service_date" DATE NOT NULL, "notes" VARCHAR(500), "created_by_id" UUID NOT NULL,
 "cancelled_at" TIMESTAMPTZ(3), "cancelled_by_id" UUID, "cancellation_reason" VARCHAR(300), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CHECK ("gross_amount">=0 AND "discount_amount">=0 AND "net_amount">=0 AND "paid_amount">=0 AND "paid_amount"<="net_amount" AND "waived_amount">=0)
);
CREATE TABLE "seed_bill_items" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "seed_bill_id" UUID NOT NULL, "product_id" UUID NOT NULL,
 "entered_quantity" DECIMAL(15,5) NOT NULL, "entered_unit" "SeedQuantityUnit" NOT NULL, "quantity_grams" BIGINT NOT NULL,
 "rate_per_kg" DECIMAL(12,2) NOT NULL, "discount_type" "SeedDiscountType" NOT NULL, "discount_value" DECIMAL(12,2) NOT NULL,
 "gross_amount" DECIMAL(12,2) NOT NULL, "discount_amount" DECIMAL(12,2) NOT NULL, "net_amount" DECIMAL(12,2) NOT NULL,
 FOREIGN KEY ("seed_bill_id") REFERENCES "seed_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CHECK ("entered_quantity">0 AND "quantity_grams">0 AND "rate_per_kg">=0 AND "discount_value">=0 AND "gross_amount">=0 AND "discount_amount">=0 AND "net_amount">=0)
);
ALTER TABLE "seed_stock_movements" ADD COLUMN "seed_bill_item_id" UUID REFERENCES "seed_bill_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_ledger_entries" ADD COLUMN "seed_bill_id" UUID REFERENCES "seed_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "seed_bills_customer_id_service_date_idx" ON "seed_bills"("customer_id","service_date");
CREATE INDEX "seed_bills_created_by_id_idx" ON "seed_bills"("created_by_id");
CREATE INDEX "seed_bills_status_idx" ON "seed_bills"("status");
CREATE INDEX "seed_bill_items_seed_bill_id_idx" ON "seed_bill_items"("seed_bill_id");
CREATE INDEX "seed_bill_items_product_id_idx" ON "seed_bill_items"("product_id");
CREATE INDEX "seed_stock_movements_seed_bill_item_id_idx" ON "seed_stock_movements"("seed_bill_item_id");
CREATE INDEX "customer_ledger_entries_seed_bill_id_idx" ON "customer_ledger_entries"("seed_bill_id");
