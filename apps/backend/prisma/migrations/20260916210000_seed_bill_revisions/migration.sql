ALTER TYPE "LedgerEntryType" ADD VALUE 'SEED_SALE_ADJUSTMENT';

ALTER TABLE "seed_bill_items" ADD COLUMN "is_current" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "seed_bill_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "seed_bill_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "reason" VARCHAR(300) NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "revised_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seed_bill_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seed_bill_revisions_seed_bill_id_revision_number_key" ON "seed_bill_revisions"("seed_bill_id", "revision_number");
CREATE INDEX "seed_bill_revisions_revised_by_id_idx" ON "seed_bill_revisions"("revised_by_id");
CREATE INDEX "seed_bill_items_seed_bill_id_is_current_idx" ON "seed_bill_items"("seed_bill_id", "is_current");
ALTER TABLE "seed_bill_revisions" ADD CONSTRAINT "seed_bill_revisions_seed_bill_id_fkey" FOREIGN KEY ("seed_bill_id") REFERENCES "seed_bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seed_bill_revisions" ADD CONSTRAINT "seed_bill_revisions_revised_by_id_fkey" FOREIGN KEY ("revised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
