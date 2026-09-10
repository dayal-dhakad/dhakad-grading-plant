CREATE TYPE "SeedDiscountType" AS ENUM ('NONE', 'FIXED', 'PERCENTAGE');
CREATE TYPE "SeedQuantityUnit" AS ENUM ('GRAM', 'KILOGRAM', 'QUINTAL');
CREATE TYPE "SeedStockMovementType" AS ENUM ('OPENING_STOCK', 'STOCK_ADDED', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE');

ALTER TABLE "products"
  ADD COLUMN "selling_rate_per_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount_type" "SeedDiscountType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "discount_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "low_stock_grams" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE "seed_stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "movement_type" "SeedStockMovementType" NOT NULL,
  "quantity_grams" BIGINT NOT NULL,
  "entered_quantity" DECIMAL(15,5) NOT NULL,
  "entered_unit" "SeedQuantityUnit" NOT NULL,
  "reason" VARCHAR(300) NOT NULL,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seed_stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "seed_stock_movements_quantity_not_zero_check" CHECK ("quantity_grams" <> 0),
  CONSTRAINT "seed_stock_movements_entered_quantity_positive_check" CHECK ("entered_quantity" > 0),
  CONSTRAINT "seed_stock_movements_reason_not_blank_check" CHECK (btrim("reason") <> '')
);

ALTER TABLE "products"
  ADD CONSTRAINT "products_selling_rate_nonnegative_check" CHECK ("selling_rate_per_kg" >= 0),
  ADD CONSTRAINT "products_discount_value_nonnegative_check" CHECK ("discount_value" >= 0),
  ADD CONSTRAINT "products_discount_percentage_check" CHECK ("discount_type" <> 'PERCENTAGE' OR "discount_value" <= 100),
  ADD CONSTRAINT "products_discount_none_check" CHECK ("discount_type" <> 'NONE' OR "discount_value" = 0),
  ADD CONSTRAINT "products_low_stock_nonnegative_check" CHECK ("low_stock_grams" >= 0);

CREATE INDEX "seed_stock_movements_product_id_created_at_idx" ON "seed_stock_movements"("product_id", "created_at");
CREATE INDEX "seed_stock_movements_created_by_id_idx" ON "seed_stock_movements"("created_by_id");

ALTER TABLE "seed_stock_movements"
  ADD CONSTRAINT "seed_stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "seed_stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
