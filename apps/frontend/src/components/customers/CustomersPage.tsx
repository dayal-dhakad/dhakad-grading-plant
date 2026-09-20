import { useDeferredValue, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CreateCustomerSchema, type Customer } from '@dhakad/shared';
import { ApiErrorResponseSchema } from '@/services/api/auth-api';
import {
  useCreateCustomerMutation,
  useGetCustomersQuery,
  useSetCustomerStatusMutation,
  useUpdateCustomerMutation,
} from '@/services/api/customer-api';
import { MobileNumberInput } from '../form/MobileNumberInput';
import { TablePagination } from '../table/TablePagination';

type StatusFilter = 'active' | 'inactive' | 'all';
type FormField = 'mobile' | 'name' | 'village' | 'address';
type FormErrors = Partial<Record<FormField, string>>;

const CustomerForm = ({ customer, onClose }: { customer?: Customer; onClose: () => void }) => {
  const [mobile, setMobile] = useState(customer?.mobile ?? '');
  const [name, setName] = useState(customer?.name ?? '');
  const [village, setVillage] = useState(customer?.village ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [smsConsent, setSmsConsent] = useState(customer?.smsConsent ?? false);
  const [whatsappConsent, setWhatsappConsent] = useState(customer?.whatsappConsent ?? true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState('');
  const [createCustomer, createState] = useCreateCustomerMutation();
  const [updateCustomer, updateState] = useUpdateCustomerMutation();
  const saving = createState.isLoading || updateState.isLoading;
  const clearError = (field: FormField) =>
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  const validateField = (field: FormField, value: string) => {
    const result = CreateCustomerSchema.shape[field].safeParse(value);
    if (result.success) clearError(field);
    else
      setErrors((current) => ({
        ...current,
        [field]: result.error.issues[0]?.message ?? 'Please enter a valid value',
      }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const result = CreateCustomerSchema.safeParse({
      mobile,
      name,
      village,
      address,
      smsConsent,
      whatsappConsent,
    });
    if (!result.success) {
      const next: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (
          (field === 'mobile' || field === 'name' || field === 'village' || field === 'address') &&
          !next[field]
        )
          next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      if (customer) await updateCustomer({ id: customer.id, input: result.data }).unwrap();
      else await createCustomer(result.data).unwrap();
      onClose();
    } catch (error) {
      const parsed = ApiErrorResponseSchema.safeParse(error);
      if (!parsed.success) {
        setMessage('Unable to save the customer. Please try again.');
        return;
      }
      const fieldErrors: FormErrors = {};
      for (const detail of parsed.data.data.error.details ?? []) {
        if (
          detail.path === 'mobile' ||
          detail.path === 'name' ||
          detail.path === 'village' ||
          detail.path === 'address'
        )
          fieldErrors[detail.path] = detail.message;
      }
      setErrors(fieldErrors);
      setMessage(parsed.data.data.error.message);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-stone-950/45 sm:place-items-center sm:p-6"
      role="presentation"
    >
      <section
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
              Customer details
            </p>
            <h2 id="customer-form-title" className="mt-1 text-2xl font-bold">
              {customer ? 'Edit customer' : 'Add customer'}
            </h2>
          </div>
          <button
            type="button"
            className="secondary-button min-h-10 px-3"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)} noValidate>
          <MobileNumberInput
            id="customer-mobile"
            label="Mobile number"
            value={mobile}
            onChange={(value) => {
              setMobile(value);
              clearError('mobile');
            }}
            onBlur={() => validateField('mobile', mobile)}
            error={errors.mobile}
          />
          <TextField
            id="customer-name"
            label="Customer name"
            value={name}
            onChange={(value) => {
              setName(value);
              clearError('name');
            }}
            onBlur={() => validateField('name', name)}
            error={errors.name}
            autoComplete="name"
          />
          <fieldset className="rounded-xl border border-stone-200 p-4">
            <legend className="px-1 text-sm font-bold">Notification consent</legend>
            <p className="mb-3 text-xs text-stone-500">
              Enable only after the customer agrees to receive transaction alerts and reminders.
            </p>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                />
                SMS
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                />
                WhatsApp
              </label>
            </div>
          </fieldset>
          <TextField
            id="customer-village"
            label="Village"
            value={village}
            onChange={(value) => {
              setVillage(value);
              clearError('village');
            }}
            onBlur={() => validateField('village', village)}
            error={errors.village}
          />
          <TextField
            id="customer-address"
            label="Address (optional)"
            value={address}
            onChange={(value) => {
              setAddress(value);
              clearError('address');
            }}
            onBlur={() => validateField('address', address)}
            error={errors.address}
          />
          {message && (
            <p
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              role="alert"
            >
              {message}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : customer ? 'Save changes' : 'Add customer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

const TextField = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | undefined;
  autoComplete?: string;
}) => (
  <div>
    <label className="field-label" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className={`field mt-2 ${error ? 'border-red-500 focus:border-red-600 focus:ring-red-100' : ''}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      autoComplete={autoComplete}
    />
    {error && (
      <p id={`${id}-error`} className="mt-2 text-sm font-medium text-red-700" role="alert">
        {error}
      </p>
    )}
  </div>
);

export const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useGetCustomersQuery({
    ...(deferredSearch ? { search: deferredSearch } : {}),
    status,
    page,
    pageSize,
  });
  const [setStatusMutation, statusState] = useSetCustomerStatusMutation();
  const changeStatus = (customer: Customer) => {
    void setStatusMutation({ id: customer.id, isActive: !customer.isActive });
  };
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Customer directory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Customers</h1>
          <p className="mt-2 text-stone-600">
            Find customers quickly by mobile number, name, or village.
          </p>
        </div>
        <button className="primary-button" onClick={() => setCreating(true)}>
          + Add customer
        </button>
      </div>
      <section className="mt-5 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor="customer-search">
            Search customers
          </label>
          <input
            id="customer-search"
            className="compact-field pr-10"
            type="search"
            placeholder="Mobile number, name, or village"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {isFetching && (
            <span
              className="absolute inset-y-0 right-3 grid place-items-center text-brand-700"
              aria-label="Updating results"
            >
              ●
            </span>
          )}
        </div>
        <div
          className="flex shrink-0 items-center gap-1 rounded-lg bg-stone-100 p-1"
          aria-label="Customer status filter"
        >
          {(['active', 'inactive', 'all'] as const).map((option) => (
            <button
              key={option}
              className={`customer-filter-button capitalize ${status === option ? 'bg-brand-800 text-white shadow-sm' : 'text-stone-600 hover:bg-white'}`}
              onClick={() => {
                setStatus(option);
                setPage(1);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </section>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-600">
            {data
              ? `${data.pagination.total} customer${data.pagination.total === 1 ? '' : 's'}`
              : 'Customers'}
          </p>
        </div>
        {isLoading ? (
          <div className="card text-center text-stone-600">Loading customers…</div>
        ) : isError ? (
          <div className="card text-center">
            <p className="font-semibold text-red-700">Unable to load customers</p>
            <button className="secondary-button mt-4" onClick={() => void refetch()}>
              Try again
            </button>
          </div>
        ) : data?.customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-10 text-center">
            <p className="text-lg font-bold">No customers found</p>
            <p className="mt-2 text-stone-600">
              {search
                ? 'Try a different mobile number, name, or village.'
                : 'Add the first customer to get started.'}
            </p>
          </div>
        ) : (
          <div className="table-panel" role="table" aria-label="Customers">
            <div
              className="hidden min-w-[806px] grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_120px_90px_176px] items-center gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-[0.6875rem] font-bold uppercase tracking-wider text-stone-500 sm:grid"
              role="row"
            >
              <span role="columnheader">Customer</span>
              <span role="columnheader">Location</span>
              <span className="text-right" role="columnheader">
                Total dues
              </span>
              <span role="columnheader">Status</span>
              <span className="text-right" role="columnheader">
                Actions
              </span>
            </div>
            {data?.customers.map((customer) => (
              <article
                key={customer.id}
                className="grid gap-1.5 border-t border-stone-100 px-3 py-1 transition first:border-t-0 hover:bg-brand-50/40 sm:min-w-[806px] sm:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_120px_90px_176px] sm:items-center sm:gap-3"
                role="row"
              >
                <div className="min-w-0 leading-tight" role="cell">
                  <Link
                    className="block truncate text-sm font-bold text-brand-800 hover:underline"
                    to={`/customers/${customer.id}`}
                  >
                    {customer.name}
                  </Link>
                  <p className="text-[0.6875rem] font-semibold tabular-nums text-stone-500">
                    {customer.mobile}
                  </p>
                </div>
                <div className="min-w-0 leading-tight" role="cell">
                  <p className="truncate text-sm font-semibold leading-tight text-stone-800">
                    {customer.village}
                  </p>
                  <p className="truncate text-[0.6875rem] leading-tight text-stone-500">
                    {customer.address || 'No address'}
                  </p>
                </div>
                <p
                  className={`text-left font-bold tabular-nums sm:text-right ${Number(customer.totalDue) > 0 ? 'text-red-700' : 'text-emerald-700'}`}
                  role="cell"
                >
                  ₹{customer.totalDue}
                </p>
                <div role="cell">
                  <span
                    className={`status-badge ${customer.isActive ? 'status-badge-positive' : 'status-badge-muted'}`}
                  >
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex shrink-0 justify-end gap-1.5" role="cell">
                  <button
                    className="compact-table-button border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    onClick={() => setEditing(customer)}
                  >
                    Edit
                  </button>
                  <button
                    className={`compact-table-button ${customer.isActive ? 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100' : 'border-brand-100 bg-brand-50 text-brand-800 hover:bg-brand-100'}`}
                    disabled={statusState.isLoading}
                    onClick={() => changeStatus(customer)}
                  >
                    {customer.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </article>
            ))}
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={data?.pagination.total ?? 0}
              totalPages={data?.pagination.totalPages ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>
      {creating && <CustomerForm onClose={() => setCreating(false)} />}{' '}
      {editing && <CustomerForm customer={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};
