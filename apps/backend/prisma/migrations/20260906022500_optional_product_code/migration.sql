-- Product codes are optional; PostgreSQL permits multiple NULL values in a unique index.
ALTER TABLE "products" ADD COLUMN "code" VARCHAR(50);
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
ALTER TABLE "products" ADD CONSTRAINT "products_code_not_blank_check" CHECK ("code" IS NULL OR btrim("code") <> '');

-- Variant identity is its product/name pair; variants do not carry packaging codes.
DROP INDEX "product_variants_code_key";
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_code_not_blank_check";
ALTER TABLE "product_variants" DROP COLUMN "code";
