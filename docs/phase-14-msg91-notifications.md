# Phase 14 — MSG91 SMS and WhatsApp Notifications

Status: implementation complete locally; Fast2SMS WhatsApp templates verified on 2026-09-29;
live provider delivery verification remains pending.

## Fast2SMS WhatsApp update

- Fast2SMS now handles WhatsApp template delivery; MSG91 remains the SMS provider.
- `GRADING_CREATED` maps to the verified Hindi `crop_grading_completed_hindi_new` template and sends
  customer name, grading receipt number, total, paid, due, and a secure public receipt URL.
- `SEED_BILL_CREATED` maps to the verified English `seed_bill_confirmation_new` template.
- Seed confirmation messages contain a random, unguessable public receipt URL. The public endpoint
  exposes only receipt data and does not require or grant an application session.
- Fast2SMS configuration uses `FAST2SMS_API_KEY`, `FAST2SMS_PHONE_NUMBER_ID`, API version, and
  separate template-name and language variables for grading, seed, and due-reminder messages.
- The connected WhatsApp sender is `+91 99819 80308` with Phone Number ID
  `1122050301001410`. The seed message configuration is unchanged.
- The final image-header due-reminder template is the Hindi Utility template
  `payment_due_reminder_final` (template ID `1617083063201110`). Its body accepts only the customer
  name as `{{1}}` and additionally requires a public HTTPS header-image URL.

## Implemented scope

- MSG91 provider adapters for SMS Flow and WhatsApp template delivery.
- An asynchronous, append-oriented notification outbox with bounded retries. Provider failures do
  not roll back grading, billing, or payment transactions.
- Automatic consent-aware notifications for grading creation/cancellation, seed-bill
  creation/cancellation, and customer payment receipt/reversal.
- Separate SMS and WhatsApp consent flags remain available on each customer. WhatsApp is enabled
  by default for new and existing customers by the confirmed business decision; staff can disable
  it for customers who opt out. SMS remains disabled by default.
- Administrator customer forms record consent with an explicit reminder that the customer must
  agree first.
- Customer detail pages support due reminders through approved SMS and WhatsApp templates, with
  an optional 120-character template variable instead of unrestricted messaging.
- The administrator customer table provides per-customer WhatsApp due reminders and a confirmed
  bulk action for every customer with a positive authoritative ledger balance. Zero-due row actions
  are disabled. WhatsApp due reminders do not require the stored transaction-notification consent
  flag; SMS reminders and automatic notifications retain consent enforcement.
- Customer notification history records the channel, event, template key, preview, attempts,
  provider message identifier, status, error, creator, and timestamps.

## API

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/reminders`

Both routes require authentication and strict Zod validation. Reminder requests reject duplicate
channels, missing channel consent, and customers without an outstanding balance.

## Configuration required for live verification

- `MSG91_AUTH_KEY`
- `MSG91_SMS_FLOW_ID`
- `MSG91_WHATSAPP_INTEGRATED_NUMBER`
- `MSG91_WHATSAPP_TEMPLATE_NAME`
- `MSG91_WHATSAPP_TEMPLATE_LANGUAGE`
- `FAST2SMS_API_KEY`
- `FAST2SMS_PHONE_NUMBER_ID=1122050301001410`
- `FAST2SMS_GRADING_TEMPLATE_NAME=crop_grading_completed_hindi_new`
- `FAST2SMS_GRADING_TEMPLATE_LANGUAGE=hi`
- `FAST2SMS_SEED_TEMPLATE_NAME=seed_bill_confirmation_new`
- `FAST2SMS_SEED_TEMPLATE_LANGUAGE=en`
- `FAST2SMS_DUE_REMINDER_TEMPLATE_NAME=payment_due_reminder_final`
- `FAST2SMS_DUE_REMINDER_TEMPLATE_LANGUAGE=hi`
- `FAST2SMS_DUE_REMINDER_HEADER_IMAGE_URL`

Secrets belong only in `apps/backend/.env`. The example environment files contain blank
placeholders.

## Database

- Added notification channel, event, and delivery-status enums.
- Added append-oriented `notifications` outbox/history records.
- Added customer SMS and WhatsApp consent flags.
- Migration `20260914210000_msg91_notifications` was applied without resetting existing data.

## Verification completed

- Prisma schema validation, client generation, and migration deployment: passed.
- Repository lint and strict typecheck: passed.
- Tests: 12 backend files / 37 tests, 1 frontend file / 4 tests, and 10 shared files / 40 tests passed.
- Production builds for shared, backend, frontend/PWA, and Electron: passed.

## Remaining phase gate

- Configure the production credentials for MSG91 SMS and the connected Fast2SMS WhatsApp sender.
- Send one consented test notification through each channel and confirm the provider accepts the
  configured payload and template-variable order.
- Configure and verify MSG91 delivery callbacks before promoting SENT records to DELIVERED/READ.

Phase 14 must not be marked complete until these provider checks pass.
