import clsx from 'clsx';
import { Button } from '@/components/Button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  actionsClassName?: string;
  buttonClassName?: string;
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  itemLabel,
  onPageChange,
  disabled = false,
  className,
  actionsClassName,
  buttonClassName,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className={clsx('app-pagination', className)}>
      <span>
        {totalItems.toLocaleString('es-CO')} {itemLabel} - pagina {page} de {safeTotalPages}
      </span>
      <nav className={clsx('app-pagination__actions', actionsClassName)} aria-label="Paginacion">
        <Button
          className={clsx('app-pagination__button', buttonClassName)}
          variant="primary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        <Button
          className={clsx('app-pagination__button', buttonClassName)}
          variant="primary"
          size="sm"
          disabled={disabled || totalPages === 0 || page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </nav>
    </div>
  );
}
