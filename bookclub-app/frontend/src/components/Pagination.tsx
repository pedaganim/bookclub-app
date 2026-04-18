import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  currentItemsCount: number;
  isLoading?: boolean;
  totalCount?: number;
  startIndex?: number; // 1-based start index of the current page items, if available
  itemLabelSingular?: string;
  itemLabelPlural?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  pageSize,
  onPageSizeChange,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  currentItemsCount,
  isLoading = false,
  totalCount,
  startIndex,
  itemLabelSingular = 'item',
  itemLabelPlural = 'items',
}) => {
  const pageSizeOptions = [10, 25, 50, 100];
  const hasTotal = typeof totalCount === 'number';
  const showRange = typeof startIndex === 'number' && startIndex > 0;
  const computedEnd = showRange ? startIndex! + Math.max(currentItemsCount, 0) - 1 : undefined;
  const rangeStart = showRange ? startIndex : undefined;
  const rangeEnd = showRange
    ? (hasTotal ? Math.min(computedEnd!, totalCount as number) : computedEnd)
    : undefined;

  return (
    <div className="bg-white px-6 py-4 border border-gray-100 rounded-3xl shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Page Size Selector */}
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            className="border-2 border-gray-100 rounded-xl px-4 py-1.5 text-sm font-bold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">{itemLabelPlural} per page</span>
        </div>

        {/* Range Info */}
        <div className="text-center">
          <span className="text-sm font-black text-gray-900 italic uppercase">
            {showRange ? (
              hasTotal && (rangeStart as number) <= (totalCount as number) ? (
                <>Showing {rangeStart}-{rangeEnd} <span className="text-gray-400">of</span> {totalCount}</>
              ) : (
                <>Showing {rangeStart}-{rangeEnd}</>
              )
            ) : (
              hasTotal ? (
                <>Showing {currentItemsCount} <span className="text-gray-400">of</span> {totalCount}</>
              ) : (
                <>Showing {currentItemsCount}</>
              )
            )}
          </span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || isLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group text-xs uppercase tracking-tight"
          >
            <ChevronLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Previous
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed group text-xs uppercase tracking-tight"
          >
            Next
            <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;