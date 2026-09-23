import { useState, type FormEvent } from 'react';
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  type Expense,
  type ExpenseCategory,
} from '@dhakad/shared';
import { MoneyInput } from '@/components/form/MoneyInput';
import { TablePagination } from '@/components/table/TablePagination';
import { ApiErrorResponseSchema } from '@/services/api/auth-api';
import {
  useCreateExpenseMutation,
  useGetExpensesQuery,
  useUpdateExpenseMutation,
} from '@/services/api/expense-api';

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: 'WORKER_PAYMENT', label: 'Worker payment' },
  { value: 'ELECTRICITY_BILL', label: 'Electricity bill' },
  { value: 'MACHINE_PARTS', label: 'Machine parts' },
  { value: 'TEA_REFRESHMENTS', label: 'Tea / refreshments' },
  { value: 'OTHER', label: 'Other' },
];
const label = (value: ExpenseCategory, other: string | null) =>
  value === 'OTHER' ? (other ?? 'Other') : categories.find((x) => x.value === value)!.label;
const rupees = (value: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value));
const today = () => new Date().toISOString().slice(0, 10);
export const ExpensesPage = ({ staff = false }: { staff?: boolean }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [editing, setEditing] = useState<Expense>();
  const [modal, setModal] = useState(false);
  const { data, isLoading, isError } = useGetExpensesQuery({
    page,
    pageSize,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(category ? { category } : {}),
  });
  const filter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="card-label">Business costs</p>
          <h1 className="mt-1 text-3xl font-bold">Expenses</h1>
          <p className="mt-2 text-sm text-stone-600">
            {staff
              ? 'Record and review expenses added by you.'
              : 'Record and review day-to-day expenses.'}
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setEditing(undefined);
            setModal(true);
          }}
        >
          Add expense
        </button>
      </header>
      <section className="card grid grid-cols-2 gap-2 p-3 sm:flex sm:items-end sm:gap-4 sm:p-5">
        <label className="field-label min-w-0 sm:w-44">
          From
          <input
            className="field mt-1 min-w-0 px-2 py-2 sm:mt-2"
            type="date"
            value={from}
            onChange={(e) => filter(setFrom)(e.target.value)}
          />
        </label>
        <label className="field-label min-w-0 sm:w-44">
          To
          <input
            className="field mt-1 min-w-0 px-2 py-2 sm:mt-2"
            type="date"
            value={to}
            onChange={(e) => filter(setTo)(e.target.value)}
          />
        </label>
        <label className="field-label col-span-2 min-w-0 sm:w-56">
          Category
          <select
            className="field mt-1 py-2 sm:mt-2"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ExpenseCategory | '');
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="card">
          <p className="card-label">Matching expenses</p>
          <p className="mt-2 text-2xl font-bold">{data?.total ?? 0}</p>
        </article>
        <article className="card">
          <p className="card-label">Total amount</p>
          <p className="mt-2 text-2xl font-bold text-brand-800">
            {rupees(data?.totalAmount ?? '0.00')}
          </p>
        </article>
      </section>
      <section className="table-panel">
        <table className="data-table min-w-[800px]">
          <thead>
            <tr>
              <th>No.</th>
              <th>Date</th>
              <th>Category</th>
              <th>Paid to</th>
              <th>Notes</th>
              <th className="text-right">Amount</th>
              {!staff && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.expenses.map((x) => (
              <tr key={x.id}>
                <td className="font-bold">EXP-{String(x.expenseNumber).padStart(6, '0')}</td>
                <td>{x.expenseDate}</td>
                <td className="font-semibold">{label(x.category, x.otherCategory)}</td>
                <td>{x.paidTo || '—'}</td>
                <td className="max-w-72 truncate">{x.notes || '—'}</td>
                <td className="text-right font-bold tabular-nums">{rupees(x.amount)}</td>
                {!staff && (
                  <td>
                    <button
                      className="secondary-button min-h-0 px-3 py-2"
                      onClick={() => {
                        setEditing(x);
                        setModal(true);
                      }}
                    >
                      Edit{x.revisionCount ? ` (${x.revisionCount})` : ''}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <p className="p-5">Loading expenses…</p>}
        {isError && <p className="p-5 text-red-700">Expenses could not be loaded.</p>}
        {!isLoading && !data?.expenses.length && (
          <p className="p-5 text-stone-600">No expenses found.</p>
        )}{' '}
        {data && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            totalPages={Math.ceil(data.total / pageSize)}
            onPageChange={setPage}
            onPageSizeChange={(v) => {
              setPageSize(v);
              setPage(1);
            }}
          />
        )}
      </section>
      {modal && (
        <ExpenseModal {...(editing ? { expense: editing } : {})} onClose={() => setModal(false)} />
      )}
    </div>
  );
};
const ExpenseModal = ({ expense, onClose }: { expense?: Expense; onClose: () => void }) => {
  const [expenseDate, setDate] = useState(expense?.expenseDate ?? today());
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'WORKER_PAYMENT');
  const [otherCategory, setOther] = useState(expense?.otherCategory ?? '');
  const [amount, setAmount] = useState(expense?.amount ?? '');
  const [paidTo, setPaidTo] = useState(expense?.paidTo ?? '');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [editReason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [create, cs] = useCreateExpenseMutation();
  const [update, us] = useUpdateExpenseMutation();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    const base = {
      expenseDate,
      category,
      otherCategory: category === 'OTHER' ? otherCategory : null,
      amount,
      paidTo: paidTo || null,
      notes: notes || null,
    };
    const result = expense
      ? UpdateExpenseSchema.safeParse({ ...base, editReason })
      : CreateExpenseSchema.safeParse(base);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (path && !next[path]) next[path] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    try {
      if (expense)
        await update({ id: expense.id, input: UpdateExpenseSchema.parse(result.data) }).unwrap();
      else await create(CreateExpenseSchema.parse(result.data)).unwrap();
      onClose();
    } catch (error) {
      const parsed = ApiErrorResponseSchema.safeParse(error);
      if (parsed.success) {
        const next: Record<string, string> = {};
        for (const detail of parsed.data.data.error.details ?? [])
          if (detail.path && !next[detail.path]) next[detail.path] = detail.message;
        setFieldErrors(next);
        setMessage(Object.keys(next).length ? '' : parsed.data.data.error.message);
      } else setMessage('Unable to save expense.');
    }
  };
  const clearError = (field: string) =>
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  const errorClass = (field: string) => (fieldErrors[field] ? ' border-red-500' : '');
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <p className="card-label">{expense ? 'Edit' : 'New'} expense</p>
            <h2 className="mt-1 text-2xl font-bold">Expense details</h2>
          </div>
          <button className="secondary-button min-h-0" onClick={onClose}>
            Close
          </button>
        </div>
        <form
          noValidate
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => void submit(e)}
        >
          <label className="field-label">
            Expense date *
            <input
              className={`field mt-2${errorClass('expenseDate')}`}
              type="date"
              value={expenseDate}
              aria-invalid={Boolean(fieldErrors.expenseDate)}
              onChange={(e) => {
                setDate(e.target.value);
                clearError('expenseDate');
              }}
            />
            <FieldError message={fieldErrors.expenseDate} />
          </label>
          <label className="field-label">
            Category *
            <select
              className={`field mt-2${errorClass('category')}`}
              value={category}
              aria-invalid={Boolean(fieldErrors.category)}
              onChange={(e) => {
                setCategory(e.target.value as ExpenseCategory);
                clearError('category');
              }}
            >
              {categories.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.category} />
          </label>
          {category === 'OTHER' && (
            <label className="field-label sm:col-span-2">
              Other category *
              <input
                className={`field mt-2${errorClass('otherCategory')}`}
                value={otherCategory}
                aria-invalid={Boolean(fieldErrors.otherCategory)}
                onChange={(e) => {
                  setOther(e.target.value);
                  clearError('otherCategory');
                }}
              />
              <FieldError message={fieldErrors.otherCategory} />
            </label>
          )}
          <label className="field-label">
            Amount *
            <MoneyInput
              className={`field mt-2${errorClass('amount')}`}
              value={amount}
              aria-invalid={Boolean(fieldErrors.amount)}
              onChange={(e) => {
                setAmount(e.target.value);
                clearError('amount');
              }}
            />
            <FieldError message={fieldErrors.amount} />
          </label>
          <label className="field-label">
            Paid to / name
            <input
              className={`field mt-2${errorClass('paidTo')}`}
              value={paidTo}
              aria-invalid={Boolean(fieldErrors.paidTo)}
              onChange={(e) => {
                setPaidTo(e.target.value);
                clearError('paidTo');
              }}
            />
            <FieldError message={fieldErrors.paidTo} />
          </label>
          <label className="field-label sm:col-span-2">
            Notes
            <textarea
              className={`field mt-2 min-h-24${errorClass('notes')}`}
              value={notes}
              aria-invalid={Boolean(fieldErrors.notes)}
              onChange={(e) => {
                setNotes(e.target.value);
                clearError('notes');
              }}
            />
            <FieldError message={fieldErrors.notes} />
          </label>
          {expense && (
            <label className="field-label sm:col-span-2">
              Reason for edit *
              <input
                className={`field mt-2${errorClass('editReason')}`}
                value={editReason}
                aria-invalid={Boolean(fieldErrors.editReason)}
                onChange={(e) => {
                  setReason(e.target.value);
                  clearError('editReason');
                }}
                placeholder="Why is this expense being changed?"
              />
              <FieldError message={fieldErrors.editReason} />
            </label>
          )}
          {message && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={cs.isLoading || us.isLoading}>
              Save expense
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

const FieldError = ({ message }: { message: string | undefined }) =>
  message ? <span className="mt-1 block text-xs font-semibold text-red-700">{message}</span> : null;
