# Phase 14 — MSG91 SMS and WhatsApp Notifications

Status: implementation complete locally on 2026-09-14; live MSG91 delivery verification pending credentials and approved templates.

## Fast2SMS WhatsApp update

- Fast2SMS now handles WhatsApp template delivery; MSG91 remains the SMS provider.
- `GRADING_CREATED` maps to the approved `crop_grading_completed` template.
- `SEED_BILL_CREATED` maps to `seed_bill_confirmation`; live delivery remains deferred until the
  template is approved by Fast2SMS/Meta.
- Seed confirmation messages contain a random, unguessable public receipt URL. The public endpoint
  exposes only receipt data and does not require or grant an application session.
- Fast2SMS configuration uses `FAST2SMS_API_KEY`, `FAST2SMS_PHONE_NUMBER_ID`, API version,
  template-name, and template-language environment variables.

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

- Configure a real MSG91 account, DLT SMS Flow, integrated WhatsApp number, and approved utility
  template.
- Send one consented test notification through each channel and confirm the provider accepts the
  configured payload and template-variable order.
- Configure and verify MSG91 delivery callbacks before promoting SENT records to DELIVERED/READ.

Phase 14 must not be marked complete until these provider checks pass.
