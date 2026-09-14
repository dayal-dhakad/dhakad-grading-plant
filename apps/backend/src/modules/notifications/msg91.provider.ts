import { z } from 'zod';
import { env } from '../../config/env.js';

const ProviderResponse = z
  .object({
    request_id: z.string().optional(),
    type: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();
const post = async (url: string, body: unknown) => {
  if (!env.MSG91_AUTH_KEY) throw new Error('MSG91 is not configured');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authkey: env.MSG91_AUTH_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const parsed = ProviderResponse.safeParse(await response.json());
  if (!response.ok || !parsed.success)
    throw new Error(`MSG91 rejected the notification (${response.status})`);
  return parsed.data.request_id ?? parsed.data.message ?? 'accepted';
};
export const sendMsg91 = async (input: {
  channel: 'SMS' | 'WHATSAPP';
  recipient: string;
  variables: Record<string, string>;
}) => {
  if (input.channel === 'SMS') {
    if (!env.MSG91_SMS_FLOW_ID) throw new Error('MSG91 SMS flow is not configured');
    return post('https://control.msg91.com/api/v5/flow/', {
      template_id: env.MSG91_SMS_FLOW_ID,
      short_url: '0',
      recipients: [{ mobiles: input.recipient, ...input.variables }],
    });
  }
  if (!env.MSG91_WHATSAPP_INTEGRATED_NUMBER || !env.MSG91_WHATSAPP_TEMPLATE_NAME)
    throw new Error('MSG91 WhatsApp template is not configured');
  return post('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    integrated_number: env.MSG91_WHATSAPP_INTEGRATED_NUMBER,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: env.MSG91_WHATSAPP_TEMPLATE_NAME,
        language: { code: env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          {
            type: 'body',
            parameters: Object.values(input.variables).map((text) => ({ type: 'text', text })),
          },
        ],
      },
      to: input.recipient,
    },
  });
};
