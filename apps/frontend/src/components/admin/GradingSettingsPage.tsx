import { useState, type FormEvent } from 'react';
import type { CropSetting } from '@dhakad/shared';
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
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [unitId, setUnitId] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [create, createState] = useCreateCropSettingMutation();
  const [update, updateState] = useUpdateCropSettingMutation();
  const [setStatus] = useSetCropStatusMutation();
  const beginEdit = (crop: CropSetting) => {
    setEditing(crop);
    setName(crop.name);
    setRate(crop.cleaningRate);
    setUnitId(crop.unit.id);
    setMessage('');
  };
  const reset = () => {
    setEditing(undefined);
    setName('');
    setRate('');
    setUnitId('');
    setMessage('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      if (editing) await update({ id: editing.id, input: { name, cleaningRate: rate } }).unwrap();
      else
        await create({
          name,
          cleaningRate: rate,
          unitId: unitId || data?.units[0]?.id || '',
        }).unwrap();
      reset();
    } catch {
      setMessage('Unable to save crop. Check the name and rate.');
    }
  };
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold text-brand-700">Administration</p>
      <h1 className="mt-1 text-3xl font-bold">Grading Settings</h1>
      <p className="mt-2 text-stone-600">
        Manage crops and the rates used for new grading entries.
      </p>
      <form
        className="card mt-6 grid gap-4 sm:grid-cols-3"
        onSubmit={(event) => void submit(event)}
      >
        <label className="field-label">
          Crop name
          <input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field-label">
          Cleaning rate
          <input
            className="field mt-2"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
        <label className="field-label">
          Rate unit
          <select
            className="field mt-2"
            disabled={Boolean(editing)}
            value={unitId || editing?.unit.id || data?.units[0]?.id || ''}
            onChange={(e) => setUnitId(e.target.value)}
          >
            {data?.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </select>
        </label>
        {message && <p className="text-sm font-semibold text-red-700 sm:col-span-3">{message}</p>}
        <div className="flex gap-3 sm:col-span-3 sm:justify-end">
          {editing && (
            <button type="button" className="secondary-button" onClick={reset}>
              Cancel edit
            </button>
          )}
          <button
            className="primary-button"
            disabled={createState.isLoading || updateState.isLoading}
          >
            {editing ? 'Save changes' : 'Add crop'}
          </button>
        </div>
      </form>
      <div className="table-panel mt-5">
        <table className="data-table min-w-[700px]">
          <thead>
            <tr>
              <th className="p-4">Crop</th>
              <th className="p-4">Rate</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
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
                  <td className="p-4">
                    <span
                      className={`status-badge ${crop.isActive ? 'status-badge-positive' : 'status-badge-muted'}`}
                    >
                      {crop.isActive ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-4">
                      <button
                        className="font-semibold text-brand-800 hover:underline"
                        onClick={() => beginEdit(crop)}
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
    </div>
  );
};
