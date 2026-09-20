ALTER TABLE "seed_bills"
ADD COLUMN "public_receipt_token" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "seed_bills_public_receipt_token_key"
ON "seed_bills"("public_receipt_token");
