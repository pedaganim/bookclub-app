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
  const labelFor = (count: number) => (count === 1 ? itemLabelSingular : itemLabelPlural);

  return (
    <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
      {/* Mobile layout */}
      <div className="flex flex-col space-y-3 sm:hidden">
        {/* Page size selector and item count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-700">
            {showRange ? (
              hasTotal && (rangeStart as number) <= (totalCount as number) ? (
                <>{rangeStart}-{rangeEnd} of {totalCount}</>
              ) : (
                <>{rangeStart}-{rangeEnd}</>
              )
            ) : (
              hasTotal ? (
                <>{currentItemsCount} of {totalCount}</>
              ) : (
                <>{currentItemsCount}</>
              )
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-center space-x-2">
          <button
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || isLoading}
            className="flex-1 max-w-24 inline-flex items-center justify-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Prev
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
            className="flex-1 max-w-24 inline-flex items-center justify-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            Next
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">{itemLabelPlural} per page</span>
        </div>

        <div className="text-sm text-gray-700">
          {showRange ? (
            hasTotal && (rangeStart as number) <= (totalCount as number) ? (
              <>Showing {rangeStart}-{rangeEnd} of {totalCount} {labelFor(totalCount as number)}</>
            ) : (
              <>Showing {rangeStart}-{rangeEnd} {labelFor(currentItemsCount)}</>
            )
          ) : (
            hasTotal ? (
              <>Showing {currentItemsCount} {labelFor(currentItemsCount)} of total {totalCount} {labelFor(totalCount as number)}</>
            ) : (
              <>Showing {currentItemsCount} {labelFor(currentItemsCount)}</>
            )
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || isLoading}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Previous
          </button>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            Next
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;