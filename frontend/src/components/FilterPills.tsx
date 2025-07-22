import React from 'react';
import { X } from 'lucide-react';

interface FilterPill {
  id: string;
  label: string;
  count?: number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
}

interface FilterPillsProps {
  title: string;
  pills: FilterPill[];
  selectedId: string;
  onSelect: (id: string) => void;
  showCounts?: boolean;
}

export function FilterPills({ title, pills, selectedId, onSelect, showCounts = true }: FilterPillsProps) {
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: isSelected 
        ? 'bg-blue-500 text-white border-blue-500' 
        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      green: isSelected 
        ? 'bg-green-500 text-white border-green-500' 
        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      purple: isSelected 
        ? 'bg-purple-500 text-white border-purple-500' 
        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      orange: isSelected 
        ? 'bg-orange-500 text-white border-orange-500' 
        : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
      red: isSelected 
        ? 'bg-red-500 text-white border-red-500' 
        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      gray: isSelected 
        ? 'bg-gray-500 text-white border-gray-500' 
        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {pills.map((pill) => {
          const isSelected = pill.id === selectedId;
          return (
            <button
              key={pill.id}
              onClick={() => onSelect(pill.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium
                transition-all duration-200 ease-in-out transform hover:scale-105
                ${getColorClasses(pill.color || 'gray', isSelected)}
                ${isSelected ? 'shadow-md' : 'shadow-sm'}
              `}
            >
              <span>{pill.label}</span>
              {showCounts && pill.count !== undefined && pill.count > 0 && (
                <span className={`
                  inline-flex items-center justify-center w-5 h-5 text-xs rounded-full
                  ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {pill.count}
                </span>
              )}
              {isSelected && pill.id !== 'all' && (
                <X className="w-3 h-3 opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}