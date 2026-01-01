import { useState, useCallback, useMemo } from 'react';

/**
 * Generic hook for managing chart category visibility state
 *
 * Provides functionality to toggle individual categories on/off and reset all categories.
 * Prevents infinite loops by using useMemo for derived values and useCallback for functions.
 *
 * @param categories - Array of category names (e.g., ['Support', 'Hosting', 'Forms'])
 * @returns Object containing:
 *   - visible: Record of category visibility states
 *   - toggleCategory: Function to toggle a single category
 *   - resetFilters: Function to reset all categories to visible
 *   - isModified: Boolean indicating if any category is hidden
 *
 * @example
 * const categories = ['Support', 'Hosting', 'Forms'];
 * const { visible, toggleCategory, resetFilters, isModified } = useChartVisibility(categories);
 *
 * // Toggle a category
 * toggleCategory('Support');
 *
 * // Reset all to visible
 * resetFilters();
 *
 * // Check visibility in render
 * <Bar fill={visible['Support'] ? '#3B82F6' : '#D1D5DB'} />
 */
export function useChartVisibility(categories: readonly string[]) {
  // Initialize all categories as visible
  const initialState = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }, [categories]);

  const [visible, setVisible] = useState<Record<string, boolean>>(initialState);

  /**
   * Toggle visibility of a single category
   * Uses useCallback to prevent unnecessary re-renders
   */
  const toggleCategory = useCallback((category: string) => {
    setVisible((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  /**
   * Reset all categories to visible
   * Uses useCallback to prevent unnecessary re-renders
   */
  const resetFilters = useCallback(() => {
    setVisible(initialState);
  }, [initialState]);

  /**
   * Check if any filters have been applied (any category is hidden)
   * Uses useMemo to prevent recalculation on every render
   */
  const isModified = useMemo(() => {
    return Object.values(visible).some((value) => !value);
  }, [visible]);

  /**
   * Get array of currently visible categories
   * Uses useMemo to prevent unnecessary array creation
   */
  const visibleCategories = useMemo(() => {
    return Object.entries(visible)
      .filter(([, isVisible]) => isVisible)
      .map(([category]) => category);
  }, [visible]);

  return {
    visible,
    toggleCategory,
    resetFilters,
    isModified,
    visibleCategories,
  };
}
