import clsx from 'clsx';
import type { ReactNode } from 'react';

export type CatalogItemsTableColumn<Row> = {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right';
  headerClassName?: string;
  cellClassName?: string;
  render: (row: Row) => ReactNode;
};

interface CatalogItemsTableProps<Row> {
  ariaLabel: string;
  caption: string;
  rows: Row[];
  columns: CatalogItemsTableColumn<Row>[];
  rowKey: (row: Row) => number | string;
  rowClassName?: (row: Row, index: number) => string | undefined;
  maxHeightClassName?: string;
  tableMinWidthClassName?: string;
}

export function CatalogItemsTable<Row>({
  ariaLabel,
  caption,
  rows,
  columns,
  rowKey,
  rowClassName,
  maxHeightClassName = 'max-h-[34rem]',
  tableMinWidthClassName = 'min-w-[1180px]',
}: CatalogItemsTableProps<Row>) {
  return (
    <div className="catalog-items-table mt-4 overflow-hidden rounded-lg table-shell">
      <div
        tabIndex={0}
        aria-label={ariaLabel}
        className={clsx(
          'catalog-items-table__scroll overflow-x-auto overflow-y-auto overscroll-x-contain pb-1 touch-pan-x [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)]',
          maxHeightClassName,
        )}
      >
        <table
          className={clsx(
            'min-w-full table-fixed border-separate border-spacing-0 text-sm text-[color:var(--text-secondary)]',
            tableMinWidthClassName,
          )}
        >
          <caption className="sr-only">{caption}</caption>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead className="table-head">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx(
                    'table-head-cell px-3 py-3 text-[11px] font-semibold text-[color:var(--text-faint)] sm:px-4',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row)}
                className={clsx(
                  'table-row table-row-interactive text-[color:var(--text-secondary)]',
                  index > 0 && 'border-t theme-border-soft',
                  rowClassName?.(row, index),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-3 py-3.5 align-middle sm:px-4',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      column.cellClassName,
                    )}
                  >
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
