import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const first = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);

  useEffect(() => {
    if (page !== currentPage) onPageChange(currentPage);
  }, [currentPage, onPageChange, page]);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-b-lg border-t border-border/70 bg-card px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="font-semibold text-foreground">{first}</strong> to{' '}
          <strong className="font-semibold text-foreground">{last}</strong> of{' '}
          <strong className="font-semibold text-foreground">{total}</strong> records
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
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
            Page {currentPage} of {pageCount}
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
