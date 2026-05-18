import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PaginationControls } from '@/components/PaginationControls';

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
  mobileCardRender?: (row: Row, index: number) => ReactNode;
  itemsPerPage?: number;
  paginationLabel?: string;
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
  mobileCardRender,
  itemsPerPage = 10,
  paginationLabel = 'items',
}: CatalogItemsTableProps<Row>) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedRows = useMemo(
    () => rows.slice(startIndex, startIndex + itemsPerPage),
    [itemsPerPage, rows, startIndex],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [rows, itemsPerPage]);

  useEffect(() => {
    if (currentPage > Math.max(totalPages, 1)) {
      setCurrentPage(Math.max(totalPages, 1));
    }
  }, [currentPage, totalPages]);

  return (
    <>
      <div className="catalog-items-table mt-4 overflow-hidden rounded-lg table-shell">
        {mobileCardRender ? (
          <div className="catalog-items-table__mobile sm:hidden">
            <div className="catalog-items-table__mobile-list">
              {paginatedRows.map((row, index) => {
                const absoluteIndex = startIndex + index;

                return (
                  <div
                    key={rowKey(row)}
                    className={clsx(
                      'catalog-items-table__mobile-item',
                      rowClassName?.(row, absoluteIndex),
                    )}
                  >
                    {mobileCardRender(row, absoluteIndex)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <div
          tabIndex={0}
          aria-label={ariaLabel}
          className={clsx(
            'catalog-items-table__scroll hidden overflow-x-auto overflow-y-auto overscroll-x-contain pb-1 touch-pan-x [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-strong)] sm:block',
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
              {paginatedRows.map((row, index) => {
                const absoluteIndex = startIndex + index;

                return (
                  <tr
                    key={rowKey(row)}
                    className={clsx(
                      'table-row table-row-interactive text-[color:var(--text-secondary)]',
                      absoluteIndex > 0 && 'border-t theme-border-soft',
                      rowClassName?.(row, absoluteIndex),
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        data-column={column.key}
                        data-label={column.header}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > itemsPerPage ? (
        <PaginationControls
          page={safeCurrentPage}
          totalPages={totalPages}
          totalItems={rows.length}
          itemLabel={paginationLabel}
          onPageChange={setCurrentPage}
        />
      ) : null}
    </>
  );
}
