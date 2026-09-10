import { useId } from 'react';

const ROW_OPTIONS = [10, 20, 50] as const;

export const TablePagination = ({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  const rowsId = useId();
  const safeTotalPages = Math.max(1, totalPages);
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="sticky left-0 flex min-w-full flex-col gap-2 border-t border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label className="font-semibold" htmlFor={rowsId}>
          Rows
        </label>
        <select
          id={rowsId}
          className="min-h-8 rounded-lg border border-stone-300 bg-white px-2 font-semibold text-stone-800"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {ROW_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="tabular-nums">
          {firstRow}–{lastRow} of {total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="min-h-8 rounded-lg border border-stone-300 bg-white px-3 font-semibold enabled:hover:bg-stone-100 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="min-w-20 text-center font-semibold tabular-nums text-stone-800">
          {page} / {safeTotalPages}
        </span>
        <button
          className="min-h-8 rounded-lg border border-stone-300 bg-white px-3 font-semibold enabled:hover:bg-stone-100 disabled:opacity-40"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
