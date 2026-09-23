import { useState, type FormEvent } from 'react';
import { CreateCropSettingSchema, UpdateCropSettingSchema, type CropSetting } from '@dhakad/shared';
import { MoneyInput } from '@/components/form/MoneyInput';
import { ApiErrorResponseSchema } from '@/services/api/auth-api';
import {
  useCreateCropSettingMutation,
  useGetCropSettingsQuery,
  useSetCropStatusMutation,
  useUpdateCropSettingMutation,
} from '@/services/api/grading-settings-api';
import { TablePagination } from '../table/TablePagination';

export const GradingSettingsPage = () => {
  const { data, isLoading } = useGetCropSettingsQuery();
  const [editing, setEditing] = useState<CropSetting>();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [setStatus] = useSetCropStatusMutation();
  const closeModal = () => {
    setShowModal(false);
    setEditing(undefined);
  };
  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">Administration</p>
          <h1 className="mt-1 text-3xl font-bold">Grading Settings</h1>
          <p className="mt-2 text-stone-600">
            Manage crops and the rates used for new grading entries.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setEditing(undefined);
            setShowModal(true);
          }}
        >
          Add crop
        </button>
      </header>
      <div className="table-panel mt-5">
        <table className="data-table min-w-[700px]">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-5">
                  Loading settings…
                </td>
              </tr>
            ) : (
              data?.crops.slice((page - 1) * pageSize, page * pageSize).map((crop) => (
                <tr key={crop.id}>
                  <td className="table-primary">{crop.name}</td>
                  <td className="table-money">
                    ₹{crop.cleaningRate} / {crop.unit.symbol}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${crop.isActive ? 'status-badge-positive' : 'status-badge-muted'}`}
                    >
                      {crop.isActive ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-4">
                      <button
                        className="font-semibold text-brand-800 hover:underline"
                        onClick={() => {
                          setEditing(crop);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="font-semibold text-red-700 hover:underline"
                        onClick={() => void setStatus({ id: crop.id, isActive: !crop.isActive })}
                      >
                        {crop.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={data?.crops.length ?? 0}
          totalPages={Math.ceil((data?.crops.length ?? 0) / pageSize)}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>
      {showModal && data && (
        <CropModal
          {...(editing ? { crop: editing } : {})}
          units={data.units}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

const CropModal = ({
  crop,
  units,
  onClose,
}: {
  crop?: CropSetting;
  units: { id: string; name: string; symbol: string }[];
  onClose: () => void;
}) => {
  const [name, setName] = useState(crop?.name ?? '');
  const [rate, setRate] = useState(crop?.cleaningRate ?? '');
  const [unitId, setUnitId] = useState(crop?.unit.id ?? units[0]?.id ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [create, createState] = useCreateCropSettingMutation();
  const [update, updateState] = useUpdateCropSettingMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const result = crop
      ? UpdateCropSettingSchema.safeParse({ name, cleaningRate: rate })
      : CreateCropSettingSchema.safeParse({ name, cleaningRate: rate, unitId });
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
      if (crop)
        await update({ id: crop.id, input: UpdateCropSettingSchema.parse(result.data) }).unwrap();
      else await create(CreateCropSettingSchema.parse(result.data)).unwrap();
      onClose();
    } catch (error) {
      const parsed = ApiErrorResponseSchema.safeParse(error);
      if (parsed.success) {
        const next: Record<string, string> = {};
        for (const detail of parsed.data.data.error.details ?? [])
          if (detail.path && !next[detail.path]) next[detail.path] = detail.message;
        setFieldErrors(next);
        setMessage(Object.keys(next).length ? '' : parsed.data.data.error.message);
      } else setMessage('Unable to save crop. Please try again.');
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="card w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="card-label">{crop ? 'Edit' : 'New'} crop</p>
            <h2 className="mt-1 text-2xl font-bold">Crop details</h2>
          </div>
          <button type="button" className="secondary-button min-h-0" onClick={onClose}>
            Close
          </button>
        </div>
        <form
          noValidate
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => void submit(event)}
        >
          <label className="field-label">
            Crop name *
            <input
              className={`field mt-2 ${fieldErrors.name ? 'border-red-500' : ''}`}
              value={name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((x) => ({ ...x, name: '' }));
              }}
              placeholder="Mustard or सरसों"
            />
            {fieldErrors.name && (
              <span className="mt-1 block text-xs font-semibold text-red-700">
                {fieldErrors.name}
              </span>
            )}
          </label>
          <label className="field-label">
            Cleaning rate *
            <MoneyInput
              className={`field mt-2 ${fieldErrors.cleaningRate ? 'border-red-500' : ''}`}
              inputMode="decimal"
              value={rate}
              aria-invalid={Boolean(fieldErrors.cleaningRate)}
              onChange={(e) => {
                setRate(e.target.value);
                setFieldErrors((x) => ({ ...x, cleaningRate: '' }));
              }}
            />
            {fieldErrors.cleaningRate && (
              <span className="mt-1 block text-xs font-semibold text-red-700">
                {fieldErrors.cleaningRate}
              </span>
            )}
          </label>
          <label className="field-label sm:col-span-2">
            Rate unit
            <select
              className="field mt-2"
              disabled={Boolean(crop)}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </select>
          </label>
          {message && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={createState.isLoading || updateState.isLoading}
            >
              {crop ? 'Save changes' : 'Add crop'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
