import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <p className={styles.summary}>
        Mostrando <strong>{first}</strong>–<strong>{last}</strong> de <strong>{total}</strong>
      </p>
      {totalPages > 1 && (
        <div className={styles.controls}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft />}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className={styles.position} aria-current="page">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
            <ChevronRight />
          </Button>
        </div>
      )}
    </nav>
  );
}
