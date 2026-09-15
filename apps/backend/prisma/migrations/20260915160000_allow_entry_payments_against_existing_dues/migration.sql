ALTER TABLE "grading_entries"
  DROP CONSTRAINT "grading_entries_amount_check",
  ADD CONSTRAINT "grading_entries_amount_check"
    CHECK ("calculated_amount" >= 0 AND "paid_amount" >= 0 AND "waived_amount" >= 0);

ALTER TABLE "seed_bills"
  DROP CONSTRAINT "seed_bills_check",
  ADD CONSTRAINT "seed_bills_amount_check"
    CHECK (
      "gross_amount" >= 0
      AND "discount_amount" >= 0
      AND "net_amount" >= 0
      AND "paid_amount" >= 0
      AND "waived_amount" >= 0
    );
