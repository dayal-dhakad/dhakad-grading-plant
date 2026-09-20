ALTER TABLE "seed_bills"
ADD COLUMN "subtotal_amount" DECIMAL(12,2),
ADD COLUMN "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "seed_bills" SET "subtotal_amount" = "net_amount";

ALTER TABLE "seed_bills" ALTER COLUMN "subtotal_amount" SET NOT NULL;
