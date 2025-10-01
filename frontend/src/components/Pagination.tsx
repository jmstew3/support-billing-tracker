import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | 'all') => void;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 'all'] as const;

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = totalPages === 1 ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = totalPages === 1 ? totalItems : Math.min(currentPage * pageSize, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (start > 1) {
        pages.unshift('...');
        pages.unshift(1);
      }
      
      if (end < totalPages) {
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} entries
        </span>
        
        <div className="flex items-center space-x-2 ml-4">
          <span className="text-sm text-muted-foreground">Show:</span>
          <select
            value={pageSize === totalItems ? 'all' : pageSize}
            onChange={(e) => {
              const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
              onPageSizeChange(value);
            }}
            className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">
            {pageSize === totalItems ? 'All entries' : 'entries'}
          </span>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 border border-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1">
            {getVisiblePages().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                disabled={page === '...'}
                className={`w-8 h-8 text-sm rounded ${
                  page === currentPage
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : page === '...'
                    ? 'cursor-default'
                    : 'border border-border hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 border border-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}