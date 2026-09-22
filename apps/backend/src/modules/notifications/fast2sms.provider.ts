import { z } from 'zod';
import { env } from '../../config/env.js';

const ResponseSchema = z
  .object({
    messages: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  })
  .passthrough();

const variableOrder: Partial<Record<string, string[]>> = {
  GRADING_CREATED: ['name', 'crop', 'quantity', 'amount', 'paid', 'due'],
  SEED_BILL_CREATED: ['name', 'number', 'amount', 'paid', 'due', 'receiptUrl'],
  DUE_REMINDER: ['name', 'amount'],
};

export const sendFast2SmsWhatsApp = async (input: {
  eventType: string;
  recipient: string;
  variables: Record<string, string>;
}) => {
  if (!env.FAST2SMS_API_KEY || !env.FAST2SMS_PHONE_NUMBER_ID)
    throw new Error('Fast2SMS WhatsApp is not configured');
  const order = variableOrder[input.eventType];
  if (!order) throw new Error(`No Fast2SMS template configured for ${input.eventType}`);
  const templateName =
    input.eventType === 'GRADING_CREATED'
      ? env.FAST2SMS_GRADING_TEMPLATE_NAME
      : input.eventType === 'SEED_BILL_CREATED'
        ? env.FAST2SMS_SEED_TEMPLATE_NAME
        : env.FAST2SMS_DUE_REMINDER_TEMPLATE_NAME;
  if (input.eventType === 'DUE_REMINDER' && !env.FAST2SMS_DUE_REMINDER_HEADER_IMAGE_URL)
    throw new Error('Fast2SMS due-reminder header image is not configured');
  const components = [
    ...(input.eventType === 'DUE_REMINDER'
      ? [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: env.FAST2SMS_DUE_REMINDER_HEADER_IMAGE_URL! },
              },
            ],
          },
        ]
      : []),
    {
      type: 'body',
      parameters: order.map((key) => ({ type: 'text', text: input.variables[key] ?? '' })),
    },
  ];
  const response = await fetch(
    `https://www.fast2sms.com/dev/whatsapp/${env.FAST2SMS_API_VERSION}/${env.FAST2SMS_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: env.FAST2SMS_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: env.FAST2SMS_TEMPLATE_LANGUAGE },
          components,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const json: unknown = await response.json().catch(() => ({}));
  const parsed = ResponseSchema.safeParse(json);
  if (!response.ok || !parsed.success)
    throw new Error(`Fast2SMS rejected the WhatsApp notification (${response.status})`);
  return parsed.data.messages?.[0]?.id ?? 'accepted';
};
