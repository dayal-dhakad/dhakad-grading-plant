CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TABLE "export_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" VARCHAR(50) NOT NULL,
  "format" VARCHAR(10) NOT NULL,
  "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
  "filters" JSONB NOT NULL,
  "file_name" VARCHAR(255),
  "file_data" BYTEA,
  "record_count" INTEGER,
  "error" VARCHAR(500),
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "export_jobs_created_by_id_created_at_idx" ON "export_jobs"("created_by_id", "created_at");
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
