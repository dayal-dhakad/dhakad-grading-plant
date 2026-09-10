CREATE TABLE "grading_entry_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grading_entry_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "reason" VARCHAR(300) NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "revised_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "grading_entry_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grading_entry_revisions_grading_entry_id_revision_number_key" ON "grading_entry_revisions"("grading_entry_id", "revision_number");
CREATE INDEX "grading_entry_revisions_revised_by_id_idx" ON "grading_entry_revisions"("revised_by_id");
ALTER TABLE "grading_entry_revisions" ADD CONSTRAINT "grading_entry_revisions_grading_entry_id_fkey" FOREIGN KEY ("grading_entry_id") REFERENCES "grading_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grading_entry_revisions" ADD CONSTRAINT "grading_entry_revisions_revised_by_id_fkey" FOREIGN KEY ("revised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
