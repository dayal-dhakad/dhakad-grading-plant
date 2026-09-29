CREATE TYPE "ExpenseArea" AS ENUM ('GRADING', 'SEEDS', 'ADMIN_PERSONAL');

ALTER TABLE "expenses"
ADD COLUMN "area" "ExpenseArea" NOT NULL DEFAULT 'GRADING';

CREATE INDEX "expenses_area_idx" ON "expenses"("area");
