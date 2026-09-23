CREATE TYPE "ExpenseCategory" AS ENUM ('WORKER_PAYMENT', 'ELECTRICITY_BILL', 'MACHINE_PARTS', 'TEA_REFRESHMENTS', 'OTHER');
CREATE TABLE "expenses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "expense_number" SERIAL NOT NULL,
  "expense_date" DATE NOT NULL, "category" "ExpenseCategory" NOT NULL,
  "other_category" VARCHAR(100), "amount" DECIMAL(12,2) NOT NULL,
  "paid_to" VARCHAR(120), "notes" VARCHAR(500), "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "expense_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "expense_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL, "reason" VARCHAR(300) NOT NULL,
  "before" JSONB NOT NULL, "after" JSONB NOT NULL, "revised_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "expenses"("expense_number");
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");
CREATE INDEX "expenses_category_idx" ON "expenses"("category");
CREATE UNIQUE INDEX "expense_revisions_expense_id_revision_number_key" ON "expense_revisions"("expense_id", "revision_number");
CREATE INDEX "expense_revisions_revised_by_id_idx" ON "expense_revisions"("revised_by_id");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_revisions" ADD CONSTRAINT "expense_revisions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_revisions" ADD CONSTRAINT "expense_revisions_revised_by_id_fkey" FOREIGN KEY ("revised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
