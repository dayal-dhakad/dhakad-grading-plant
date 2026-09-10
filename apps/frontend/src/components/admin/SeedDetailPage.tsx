import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetSeedProductQuery } from '@/services/api/seed-management-api';
import { TablePagination } from '../table/TablePagination';

const labels = {
  OPENING_STOCK: 'Opening stock',
  STOCK_ADDED: 'Stock added',
  ADJUSTMENT_INCREASE: 'Correction increase',
  ADJUSTMENT_DECREASE: 'Correction decrease',
};

export const SeedDetailPage = () => {
  const { id = '' } = useParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading } = useGetSeedProductQuery({ id, page, pageSize });
  if (isLoading) return <div className="card">Loading seed…</div>;
  if (!data) return <div className="card text-red-700">Seed could not be loaded.</div>;
  const { product } = data;
  return (
    <div className="mx-auto max-w-6xl">
      <Link className="font-semibold text-brand-800 hover:underline" to="/admin/seeds">
        ← Back to seeds
      </Link>
      <section className="card mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <p className="card-label">Seed</p>
          <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
          <p className="text-sm text-stone-500">
            {product.code || 'No product code'} · {product.category.name}
          </p>
        </div>
        <div>
          <p className="card-label">Rate</p>
          <p className="mt-1 text-xl font-bold">₹{product.sellingRatePerKg}/kg</p>
        </div>
        <div>
          <p className="card-label">Available stock</p>
          <p
            className={`mt-1 text-xl font-bold ${product.isLowStock ? 'text-red-700' : 'text-emerald-700'}`}
          >
            {(Number(product.stockGrams) / 1000).toFixed(3).replace(/\.?0+$/, '')} kg
          </p>
        </div>
        <div>
          <p className="card-label">Status</p>
          <span
            className={`status-badge mt-1 ${product.isActive ? 'status-badge-positive' : 'status-badge-muted'}`}
          >
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </section>
      <h2 className="mt-6 text-xl font-bold">Stock history</h2>
      <div className="table-panel mt-3">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Entered quantity</th>
              <th>Stock effect</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {!data.movements.length ? (
              <tr>
                <td colSpan={6}>No stock movement recorded.</td>
              </tr>
            ) : (
              data.movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{new Date(movement.createdAt).toLocaleString()}</td>
                  <td className="table-primary">{labels[movement.movementType]}</td>
                  <td>
                    {movement.enteredQuantity}{' '}
                    {movement.enteredUnit === 'GRAM'
                      ? 'g'
                      : movement.enteredUnit === 'KILOGRAM'
                        ? 'kg'
                        : 'q'}
                  </td>
                  <td
                    className={
                      Number(movement.quantityGrams) < 0
                        ? 'table-due'
                        : 'font-bold text-emerald-700'
                    }
                  >
                    {Number(movement.quantityGrams) > 0 ? '+' : ''}
                    {movement.quantityGrams} g
                  </td>
                  <td>{movement.reason}</td>
                  <td>{movement.createdBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={data.pagination.total}
          totalPages={data.pagination.totalPages}
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
