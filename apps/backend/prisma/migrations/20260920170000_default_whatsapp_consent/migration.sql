ALTER TABLE "customers"
ALTER COLUMN "whatsapp_consent" SET DEFAULT true;

UPDATE "customers"
SET "whatsapp_consent" = true
WHERE "whatsapp_consent" = false;
