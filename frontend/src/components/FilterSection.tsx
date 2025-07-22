import React from 'react';
import { FilterPills } from './FilterPills';
import { Filter, X } from 'lucide-react';

interface FilterSectionProps {
  // Category filters
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  categoryOptions: string[];
  categoryCounts: Record<string, number>;
  
  // Urgency filters
  urgencyFilter: string;
  setUrgencyFilter: (value: string) => void;
  urgencyOptions: string[];
  urgencyCounts: Record<string, number>;
  
  // Date filters
  dateFilter: string;
  setDateFilter: (value: string) => void;
  availableDates: string[];
  dateCounts: Record<string, number>;
  
  // Day filters
  dayFilter: string;
  setDayFilter: (value: string) => void;
  dayOptions: string[];
  dayCounts: Record<string, number>;
  
  // Actions
  onResetFilters: () => void;
  totalResults: number;
}

export function FilterSection({
  categoryFilter, setCategoryFilter, categoryOptions, categoryCounts,
  urgencyFilter, setUrgencyFilter, urgencyOptions, urgencyCounts,
  dateFilter, setDateFilter, availableDates, dateCounts,
  dayFilter, setDayFilter, dayOptions, dayCounts,
  onResetFilters,
  totalResults
}: FilterSectionProps) {
  
  const hasActiveFilters = categoryFilter !== 'all' || urgencyFilter !== 'all' || 
                          dateFilter !== 'all' || dayFilter !== 'all';
  
  // Helper to create pills with counts
  const createPills = (options: string[], counts: Record<string, number>, color: string) => {
    const allCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return [
      { id: 'all', label: 'All', count: allCount, color: 'gray' },
      ...options.filter(option => option !== 'all').map(option => ({
        id: option,
        label: option,
        count: counts[option] || 0,
        color
      }))
    ];
  };
  
  const categoryPills = createPills(categoryOptions, categoryCounts, 'blue');
  const urgencyPills = createPills(urgencyOptions, urgencyCounts, 'orange');
  
  // Create date pills (limit to recent dates for better UX)
  const recentDates = availableDates.slice(0, 10); // Show last 10 dates
  const datePills = createPills(['all', ...recentDates], dateCounts, 'green');
  
  const dayPills = createPills(dayOptions, dayCounts, 'purple');
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </span>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 
                     hover:bg-red-50 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>
      
      {/* Filter Pills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <FilterPills
          title="Category"
          pills={categoryPills}
          selectedId={categoryFilter}
          onSelect={setCategoryFilter}
        />
        
        <FilterPills
          title="Urgency"
          pills={urgencyPills}
          selectedId={urgencyFilter}
          onSelect={setUrgencyFilter}
        />
        
        <FilterPills
          title="Day of Week"
          pills={dayPills}
          selectedId={dayFilter}
          onSelect={setDayFilter}
        />
        
        <FilterPills
          title="Recent Dates"
          pills={datePills}
          selectedId={dateFilter}
          onSelect={setDateFilter}
        />
      </div>
      
      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 font-medium">Active filters:</span>
            {categoryFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                Category: {categoryFilter}
                <button onClick={() => setCategoryFilter('all')} className="hover:bg-blue-200 rounded">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {urgencyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-md">
                Urgency: {urgencyFilter}
                <button onClick={() => setUrgencyFilter('all')} className="hover:bg-orange-200 rounded">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dayFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md">
                Day: {dayFilter}
                <button onClick={() => setDayFilter('all')} className="hover:bg-purple-200 rounded">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                Date: {dateFilter}
                <button onClick={() => setDateFilter('all')} className="hover:bg-green-200 rounded">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}