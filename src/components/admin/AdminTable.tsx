import React from 'react';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import AdminLoadingState from './AdminLoadingState';

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: Array<AdminTableColumn<T>>;
  rows: T[];
  isLoading?: boolean;
  loadingLabel?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  hideTableIfError?: boolean;
  emptyMessage?: string;
  tableAriaLabel?: string;
  minWidthClassName?: string;
  rowKey?: (row: T, index: number) => string;
}

export default function AdminTable<T>({
  columns,
  rows,
  isLoading = false,
  loadingLabel = 'Carregando dados...',
  errorMessage = null,
  onRetry,
  emptyTitle = 'Nenhum registro encontrado',
  hideTableIfError = true,
  emptyMessage = 'Nenhum registro disponivel.',
  tableAriaLabel = 'Tabela com rolagem horizontal em telas pequenas',
  minWidthClassName = 'min-w-[720px]',
  rowKey,
}: AdminTableProps<T>) {
  if (isLoading) {
    return <AdminLoadingState label={loadingLabel} />;
  }

  if (errorMessage && hideTableIfError) {
    return <AdminErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div className="space-y-3">
      {errorMessage && !hideTableIfError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="overflow-x-auto pb-1" role="region" aria-label={tableAriaLabel}>
        <table className={`${minWidthClassName} w-full text-sm`}>
          <thead>
            <tr className="border-b border-brand-dark/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-[11px] uppercase tracking-brand text-brand-dark/60 font-bold ${
                    column.className ?? ''
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={rowKey?.(row, index) ?? `${index}`} className="border-b last:border-b-0 border-brand-dark/5">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-top ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
