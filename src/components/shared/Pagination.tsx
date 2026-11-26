import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/useI18n';

export interface PaginationProps {
  page?: number;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  currentPage: propCurrentPage,
  pageSize = 10,
  total,
  totalCount: propTotalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const { t } = useI18n();

  const safeTotal = Number.isFinite(total)
    ? Math.max(0, Number(total))
    : Number.isFinite(propTotalCount)
    ? Math.max(0, Number(propTotalCount))
    : 0;

  const safePageSize = Number.isFinite(pageSize) && Number(pageSize) > 0 ? Number(pageSize) : 10;
  const pageCount = Math.max(1, Math.ceil(safeTotal / safePageSize));

  const rawPage = Number.isFinite(page)
    ? Number(page)
    : Number.isFinite(propCurrentPage)
    ? Number(propCurrentPage)
    : 1;

  const currentPage = Math.min(Math.max(rawPage, 1), pageCount);
  const first = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const last = Math.min(currentPage * safePageSize, safeTotal);

  useEffect(() => {
    if (Number.isFinite(currentPage) && rawPage !== currentPage) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange, rawPage]);

  if (safeTotal === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-b-lg border-t border-border/70 bg-card px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          {t('pagination_showing', 'Showing')}{' '}
          <strong className="font-semibold text-foreground">{first}</strong>{' '}
          {t('pagination_to', 'to')}{' '}
          <strong className="font-semibold text-foreground">{last}</strong>{' '}
          {t('pagination_of', 'of')}{' '}
          <strong className="font-semibold text-foreground">{safeTotal}</strong>{' '}
          {t('pagination_records', 'records')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>{t('pagination_per_page', 'Per page:')}</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span className="mr-1 min-w-[70px] text-right font-medium">
            {t('pagination_page', 'Page')} {currentPage} {t('pagination_of', 'of')} {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="First page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next page"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Last page"
            disabled={currentPage >= pageCount}
            onClick={() => onPageChange(pageCount)}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
