import { useState, type FormEvent } from 'react';
import type { Customer } from '@dhakad/shared';
import { useGetNotificationsQuery, useSendReminderMutation } from '@/services/api/notification-api';
export const CustomerNotificationsPanel = ({ customer }: { customer: Customer }) => {
  const { data } = useGetNotificationsQuery({
    customerId: customer.id,
    status: 'all',
    page: 1,
    pageSize: 20,
  });
  const [sms, setSms] = useState(customer.smsConsent);
  const [whatsapp, setWhatsapp] = useState(customer.whatsappConsent);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [send, state] = useSendReminderMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const channels = [...(sms ? ['SMS' as const] : []), ...(whatsapp ? ['WHATSAPP' as const] : [])];
    try {
      const result = await send({
        customerId: customer.id,
        channels,
        note: note || undefined,
      }).unwrap();
      setNote('');
      setMessage(`${result.queued} reminder${result.queued === 1 ? '' : 's'} queued.`);
    } catch {
      setMessage('Unable to queue reminder. Check consent and outstanding dues.');
    }
  };
  return (
    <section className="card mt-5">
      <p className="card-label">Notifications</p>
      <h2 className="mt-1 text-xl font-bold">Send due reminder</h2>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={sms}
            disabled={!customer.smsConsent}
            onChange={(e) => setSms(e.target.checked)}
          />
          SMS {!customer.smsConsent && '(no consent)'}
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={whatsapp}
            disabled={!customer.whatsappConsent}
            onChange={(e) => setWhatsapp(e.target.checked)}
          />
          WhatsApp {!customer.whatsappConsent && '(no consent)'}
        </label>
        <label className="field-label sm:col-span-2">
          Approved reminder note (optional)
          <input
            className="field mt-2"
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          className="primary-button sm:col-span-2"
          disabled={state.isLoading || (!sms && !whatsapp)}
        >
          Queue reminder
        </button>
        {message && <p className="text-sm font-semibold sm:col-span-2">{message}</p>}
      </form>
      <h3 className="mt-6 font-bold">Recent delivery history</h3>
      <div className="mt-2 space-y-2">
        {data?.notifications.map((item) => (
          <div className="rounded-lg border p-3 text-sm" key={item.id}>
            <div className="flex justify-between gap-3">
              <span className="font-bold">
                {item.channel} · {item.eventType.replaceAll('_', ' ')}
              </span>
              <span>{item.status}</span>
            </div>
            <p className="mt-1 text-stone-600">{item.messagePreview}</p>
            {item.lastError && <p className="mt-1 text-red-700">{item.lastError}</p>}
          </div>
        ))}
        {!data?.notifications.length && (
          <p className="text-sm text-stone-500">No notifications yet.</p>
        )}
      </div>
    </section>
  );
};
