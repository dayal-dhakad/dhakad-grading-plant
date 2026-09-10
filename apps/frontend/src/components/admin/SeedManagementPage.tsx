import { useDeferredValue, useState, type FormEvent } from 'react';
import type { SeedProduct } from '@dhakad/shared';
import { Link } from 'react-router-dom';
import {
  useAddSeedStockMutation,
  useCreateSeedProductMutation,
  useGetSeedProductsQuery,
  useSetSeedStatusMutation,
  useUpdateSeedProductMutation,
} from '@/services/api/seed-management-api';
import { TablePagination } from '../table/TablePagination';

const displayStock = (raw: string) => {
  const grams = Number(raw);
  if (grams >= 100000 && grams % 100000 === 0) return `${grams / 100000} q`;
  if (grams >= 1000) return `${(grams / 1000).toFixed(3).replace(/\.?0+$/, '')} kg`;
  return `${grams} g`;
};

type Unit = 'GRAM' | 'KILOGRAM' | 'QUINTAL';
type Discount = 'NONE' | 'FIXED' | 'PERCENTAGE';

export const SeedManagementPage = () => {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<SeedProduct>();
  const [showForm, setShowForm] = useState(false);
  const [stockProduct, setStockProduct] = useState<SeedProduct>();
  const { data, isLoading } = useGetSeedProductsQuery({
    ...(deferred ? { search: deferred } : {}),
    status,
    page,
    pageSize,
  });
  const [setSeedStatus] = useSetSeedStatusMutation();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Inventory</p>
          <h1 className="mt-1 text-3xl font-bold">Seed management</h1>
          <p className="mt-1 text-sm text-stone-600">
            Configure seeds and maintain auditable stock.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          + Add seed
        </button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seed-product-form-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
              setEditing(undefined);
            }
          }}
        >
          <SeedProductForm
            {...(editing ? { product: editing } : {})}
            onClose={() => {
              setShowForm(false);
              setEditing(undefined);
            }}
          />
        </div>
      )}

      <section className="mt-5 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <input
          className="compact-field flex-1"
          type="search"
          placeholder="Search seed, code, or type"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <div className="flex shrink-0 gap-1 rounded-lg bg-stone-100 p-1">
          {(['active', 'inactive', 'all'] as const).map((option) => (
            <button
              className={`customer-filter-button capitalize ${status === option ? 'bg-brand-800 text-white shadow-sm' : 'text-stone-600 hover:bg-white'}`}
              key={option}
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

      <div className="table-panel mt-4">
        <table className="data-table min-w-[980px]">
          <thead>
            <tr>
              <th>Seed</th>
              <th>Rate/kg</th>
              <th>Available stock</th>
              <th>Discount</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6}>Loading seeds…</td>
              </tr>
            ) : !data?.products.length ? (
              <tr>
                <td colSpan={6}>No seeds found.</td>
              </tr>
            ) : (
              data.products.map((product) => (
                <tr key={product.id}>
                  <td className="table-primary">
                    <Link
                      className="text-brand-800 hover:underline"
                      to={`/admin/seeds/${product.id}`}
                    >
                      {product.name}
                    </Link>
                    <span className="block text-xs text-stone-500">
                      {product.code || 'No code'}
                    </span>
                  </td>
                  <td className="table-money">₹{product.sellingRatePerKg}</td>
                  <td className="table-money text-emerald-700">
                    {displayStock(product.stockGrams)}
                  </td>
                  <td>
                    {product.discountType === 'NONE'
                      ? 'None'
                      : `${product.discountValue}${product.discountType === 'PERCENTAGE' ? '%' : ' ₹'}`}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${product.isActive ? 'status-badge-positive' : 'status-badge-muted'}`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      {product.isActive && (
                        <button
                          className="font-semibold text-brand-800 hover:underline"
                          onClick={() => setStockProduct(product)}
                        >
                          Stock
                        </button>
                      )}
                      <button
                        className="font-semibold text-brand-800 hover:underline"
                        onClick={() => {
                          setEditing(product);
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="font-semibold text-red-700 hover:underline"
                        onClick={() =>
                          void setSeedStatus({ id: product.id, isActive: !product.isActive })
                        }
                      >
                        {product.isActive ? 'Deactivate' : 'Reactivate'}
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
          total={data?.pagination.total ?? 0}
          totalPages={data?.pagination.totalPages ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      </div>
      {stockProduct && (
        <StockForm product={stockProduct} onClose={() => setStockProduct(undefined)} />
      )}
    </div>
  );
};

const SeedProductForm = ({ product, onClose }: { product?: SeedProduct; onClose: () => void }) => {
  const [name, setName] = useState(product?.name ?? '');
  const [code, setCode] = useState(product?.code ?? '');
  const [rate, setRate] = useState(product?.sellingRatePerKg ?? '0');
  const [discountType, setDiscountType] = useState<Discount>(product?.discountType ?? 'NONE');
  const [discountValue, setDiscountValue] = useState(product?.discountValue ?? '0');
  const [initialStockQuantity, setInitialStockQuantity] = useState('');
  const [initialStockUnit, setInitialStockUnit] = useState<Unit>('KILOGRAM');
  const [message, setMessage] = useState('');
  const [create, createState] = useCreateSeedProductMutation();
  const [update, updateState] = useUpdateSeedProductMutation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const input = {
      name,
      code: code || undefined,
      sellingRatePerKg: rate,
      discountType,
      discountValue: discountType === 'NONE' ? '0' : discountValue,
      ...(!product && initialStockQuantity ? { initialStockQuantity, initialStockUnit } : {}),
    };
    try {
      if (product) await update({ id: product.id, input }).unwrap();
      else await create(input).unwrap();
      onClose();
    } catch {
      setMessage('Unable to save seed. Check the values and try again.');
    }
  };

  return (
    <form
      className="grid max-h-[calc(100vh-2rem)] w-full max-w-3xl gap-3 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex items-center justify-between border-b border-stone-200 pb-3 sm:col-span-2 lg:col-span-3">
        <div>
          <p className="card-label">Seed product</p>
          <h2 id="seed-product-form-title" className="mt-1 text-xl font-bold">
            {product ? 'Edit product' : 'Add product'}
          </h2>
        </div>
        <button
          type="button"
          className="grid min-h-9 w-9 place-items-center rounded-full text-xl text-stone-500 hover:bg-stone-100"
          aria-label="Close product form"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <label className="field-label">
        Seed name
        <input
          className="compact-field mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="field-label">
        Product code (optional)
        <input
          className="compact-field mt-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <label className="field-label">
        Selling rate per kg
        <input
          className="compact-field mt-1"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </label>
      <label className="field-label">
        Default discount
        <select
          className="compact-field mt-1"
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as Discount)}
        >
          <option value="NONE">None</option>
          <option value="FIXED">Fixed ₹</option>
          <option value="PERCENTAGE">Percentage</option>
        </select>
      </label>
      <label className="field-label">
        Discount value
        <input
          className="compact-field mt-1"
          disabled={discountType === 'NONE'}
          inputMode="decimal"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
        />
      </label>
      {!product && (
        <div className="field-label">
          Initial stock (optional)
          <div className="mt-1 grid grid-cols-[1fr_auto] gap-1">
            <input
              className="compact-field"
              inputMode="decimal"
              value={initialStockQuantity}
              onChange={(e) => setInitialStockQuantity(e.target.value)}
            />
            <select
              className="compact-field w-28"
              value={initialStockUnit}
              onChange={(e) => setInitialStockUnit(e.target.value as Unit)}
            >
              <option value="GRAM">g</option>
              <option value="KILOGRAM">kg</option>
              <option value="QUINTAL">q</option>
            </select>
          </div>
        </div>
      )}
      {message && (
        <p className="text-sm font-semibold text-red-700 sm:col-span-2 lg:col-span-3">{message}</p>
      )}
      <div className="flex gap-2 border-t border-stone-200 pt-3 sm:col-span-2 sm:justify-end lg:col-span-3">
        <button type="button" className="secondary-button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary-button"
          disabled={createState.isLoading || updateState.isLoading}
        >
          {product ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
};

const StockForm = ({ product, onClose }: { product: SeedProduct; onClose: () => void }) => {
  const [movementType, setMovementType] = useState<
    'OPENING_STOCK' | 'STOCK_ADDED' | 'ADJUSTMENT_INCREASE' | 'ADJUSTMENT_DECREASE'
  >(Number(product.stockGrams) === 0 ? 'OPENING_STOCK' : 'STOCK_ADDED');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('KILOGRAM');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [add, state] = useAddSeedStockMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await add({ id: product.id, input: { movementType, quantity, unit, reason } }).unwrap();
      onClose();
    } catch {
      setMessage('Unable to update stock. Check quantity, reason, and available balance.');
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={(e) => void submit(e)}
      >
        <p className="card-label">Stock adjustment</p>
        <h2 className="mt-1 text-xl font-bold">{product.name}</h2>
        <p className="mt-1 text-sm text-stone-600">Available: {displayStock(product.stockGrams)}</p>
        <label className="field-label mt-4 block">
          Action
          <select
            className="compact-field mt-1"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as typeof movementType)}
          >
            <option value="OPENING_STOCK">Opening stock</option>
            <option value="STOCK_ADDED">Add stock</option>
            <option value="ADJUSTMENT_INCREASE">Correction increase</option>
            <option value="ADJUSTMENT_DECREASE">Correction decrease</option>
          </select>
        </label>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <label className="field-label">
            Quantity
            <input
              className="compact-field mt-1"
              autoFocus
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label className="field-label">
            Unit
            <select
              className="compact-field mt-1 w-32"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
            >
              <option value="GRAM">Gram</option>
              <option value="KILOGRAM">Kilogram</option>
              <option value="QUINTAL">Quintal</option>
            </select>
          </label>
        </div>
        <label className="field-label mt-3 block">
          Reason
          <input
            className="compact-field mt-1"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required for audit history"
          />
        </label>
        {message && <p className="mt-3 text-sm font-semibold text-red-700">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={state.isLoading}>
            Save stock
          </button>
        </div>
      </form>
    </div>
  );
};
