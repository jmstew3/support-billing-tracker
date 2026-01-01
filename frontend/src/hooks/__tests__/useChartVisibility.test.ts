import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useChartVisibility } from '../useChartVisibility';

describe('useChartVisibility', () => {
  const testCategories = ['Category A', 'Category B', 'Category C'] as const;

  it('should initialize all categories as visible', () => {
    const { result } = renderHook(() => useChartVisibility(testCategories));

    expect(result.current.visible['Category A']).toBe(true);
    expect(result.current.visible['Category B']).toBe(true);
    expect(result.current.visible['Category C']).toBe(true);
    expect(result.current.isModified).toBe(false);
  });

  it('should toggle a single category visibility', () => {
    const { result } = renderHook(() => useChartVisibility(testCategories));

    act(() => {
      result.current.toggleCategory('Category A');
    });

    expect(result.current.visible['Category A']).toBe(false);
    expect(result.current.visible['Category B']).toBe(true);
    expect(result.current.visible['Category C']).toBe(true);
    expect(result.current.isModified).toBe(true);
  });

  it('should toggle a category back to visible', () => {
    const { result } = renderHook(() => useChartVisibility(testCategories));

    // Toggle off
    act(() => {
      result.current.toggleCategory('Category A');
    });
    expect(result.current.visible['Category A']).toBe(false);

    // Toggle back on
    act(() => {
      result.current.toggleCategory('Category A');
    });
    expect(result.current.visible['Category A']).toBe(true);
    expect(result.current.isModified).toBe(false);
  });

  it('should reset all categories to visible', () => {
    const { result } = renderHook(() => useChartVisibility(testCategories));

    // Hide multiple categories
    act(() => {
      result.current.toggleCategory('Category A');
      result.current.toggleCategory('Category B');
    });

    expect(result.current.visible['Category A']).toBe(false);
    expect(result.current.visible['Category B']).toBe(false);
    expect(result.current.isModified).toBe(true);

    // Reset
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.visible['Category A']).toBe(true);
    expect(result.current.visible['Category B']).toBe(true);
    expect(result.current.visible['Category C']).toBe(true);
    expect(result.current.isModified).toBe(false);
  });

  it('should correctly report isModified state', () => {
    const { result } = renderHook(() => useChartVisibility(testCategories));

    // Initially not modified
    expect(result.current.isModified).toBe(false);

    // Modified after hiding a category
    act(() => {
      result.current.toggleCategory('Category A');
    });
    expect(result.current.isModified).toBe(true);

    // Still modified with multiple hidden
    act(() => {
      result.current.toggleCategory('Category B');
    });
    expect(result.current.isModified).toBe(true);

    // Not modified after reset
    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.isModified).toBe(false);
  });

  it('should return correct visibleCategories array', () => {
    const { result } = renderHook(() => useChartVisibility(testCategories));

    // All visible initially
    expect(result.current.visibleCategories).toEqual(['Category A', 'Category B', 'Category C']);

    // Hide one category
    act(() => {
      result.current.toggleCategory('Category B');
    });
    expect(result.current.visibleCategories).toEqual(['Category A', 'Category C']);

    // Hide another
    act(() => {
      result.current.toggleCategory('Category A');
    });
    expect(result.current.visibleCategories).toEqual(['Category C']);

    // Reset
    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.visibleCategories).toEqual(['Category A', 'Category B', 'Category C']);
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useChartVisibility(testCategories));

    const initialToggle = result.current.toggleCategory;
    const initialReset = result.current.resetFilters;

    // Trigger a state change
    act(() => {
      result.current.toggleCategory('Category A');
    });

    // Function references should remain the same
    expect(result.current.toggleCategory).toBe(initialToggle);
    expect(result.current.resetFilters).toBe(initialReset);

    // Rerender should also maintain references
    rerender();
    expect(result.current.toggleCategory).toBe(initialToggle);
    expect(result.current.resetFilters).toBe(initialReset);
  });

  it('should handle empty category array', () => {
    const { result } = renderHook(() => useChartVisibility([]));

    expect(result.current.visible).toEqual({});
    expect(result.current.isModified).toBe(false);
    expect(result.current.visibleCategories).toEqual([]);
  });

  it('should handle single category', () => {
    const singleCategory = ['Only Category'] as const;
    const { result } = renderHook(() => useChartVisibility(singleCategory));

    expect(result.current.visible['Only Category']).toBe(true);
    expect(result.current.isModified).toBe(false);

    act(() => {
      result.current.toggleCategory('Only Category');
    });

    expect(result.current.visible['Only Category']).toBe(false);
    expect(result.current.isModified).toBe(true);
    expect(result.current.visibleCategories).toEqual([]);
  });
});
