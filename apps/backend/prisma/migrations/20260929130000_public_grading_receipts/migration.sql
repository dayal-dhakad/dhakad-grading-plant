ALTER TABLE "grading_entries"
ADD COLUMN "public_receipt_token" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "grading_entries_public_receipt_token_key"
ON "grading_entries"("public_receipt_token");
