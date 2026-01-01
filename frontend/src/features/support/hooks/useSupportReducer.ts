import { useReducer, useCallback } from 'react';

/**
 * Unified state management for SupportTickets component
 *
 * Consolidates 15+ useState calls into a single useReducer for:
 * - Pagination state
 * - Sorting state
 * - Filter state
 * - Bulk selection state
 * - UI state
 */

// ============================================================
// STATE TYPE DEFINITIONS
// ============================================================

export interface SupportState {
  // Pagination
  pagination: {
    currentPage: number;
    pageSize: number;
  };

  // Sorting
  sorting: {
    column: string | null;
    direction: 'asc' | 'desc';
  };

  // Filters
  filters: {
    category: string[];
    urgency: string[];
    source: string[];
    date: string;
    day: string[];
    search: string;
  };

  // Bulk selection
  selection: {
    selectedIds: Set<number>;
    selectAll: boolean;
  };

  // Staged bulk changes
  bulkEdit: {
    category: string;
    urgency: string;
    hours: number | null;
  };

  // UI state
  ui: {
    hideNonBillable: boolean;
    showArchived: boolean;
    showFilters: {
      date: boolean;
      day: boolean;
      category: boolean;
      urgency: boolean;
      source: boolean;
    };
    deleteConfirmation: {
      isOpen: boolean;
      requestIndex: number | null;
    };
  };
}

// ============================================================
// ACTION TYPE DEFINITIONS
// ============================================================

export type SupportAction =
  // Pagination actions
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'RESET_PAGINATION' }

  // Sorting actions
  | { type: 'SET_SORT'; payload: { column: string; direction: 'asc' | 'desc' } }
  | { type: 'TOGGLE_SORT'; payload: string }
  | { type: 'RESET_SORT' }

  // Filter actions
  | { type: 'SET_CATEGORY_FILTER'; payload: string[] }
  | { type: 'SET_URGENCY_FILTER'; payload: string[] }
  | { type: 'SET_SOURCE_FILTER'; payload: string[] }
  | { type: 'SET_DATE_FILTER'; payload: string }
  | { type: 'SET_DAY_FILTER'; payload: string[] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'RESET_FILTERS' }
  | { type: 'TOGGLE_FILTER_DISPLAY'; payload: keyof SupportState['ui']['showFilters'] }

  // Selection actions
  | { type: 'SELECT_REQUEST'; payload: number }
  | { type: 'DESELECT_REQUEST'; payload: number }
  | { type: 'SELECT_ALL'; payload: number[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECT_ALL'; payload: boolean }

  // Bulk edit actions
  | { type: 'STAGE_BULK_CATEGORY'; payload: string }
  | { type: 'STAGE_BULK_URGENCY'; payload: string }
  | { type: 'STAGE_BULK_HOURS'; payload: number | null }
  | { type: 'CLEAR_STAGED_CHANGES' }

  // UI actions
  | { type: 'TOGGLE_HIDE_NON_BILLABLE' }
  | { type: 'SET_HIDE_NON_BILLABLE'; payload: boolean }
  | { type: 'TOGGLE_SHOW_ARCHIVED' }
  | { type: 'OPEN_DELETE_CONFIRMATION'; payload: number }
  | { type: 'CLOSE_DELETE_CONFIRMATION' }

  // Composite actions (combining multiple state updates)
  | { type: 'FILTER_CHANGED' }; // Resets pagination and selection

// ============================================================
// INITIAL STATE
// ============================================================

export const getInitialState = (): SupportState => {
  const savedHideNonBillable = localStorage.getItem('hideNonBillable');

  return {
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    sorting: {
      column: null,
      direction: 'asc',
    },
    filters: {
      category: [],
      urgency: [],
      source: [],
      date: 'all',
      day: [],
      search: '',
    },
    selection: {
      selectedIds: new Set(),
      selectAll: false,
    },
    bulkEdit: {
      category: '',
      urgency: '',
      hours: null,
    },
    ui: {
      hideNonBillable: savedHideNonBillable !== null ? JSON.parse(savedHideNonBillable) : true,
      showArchived: false,
      showFilters: {
        date: false,
        day: false,
        category: false,
        urgency: false,
        source: false,
      },
      deleteConfirmation: {
        isOpen: false,
        requestIndex: null,
      },
    },
  };
};

// ============================================================
// REDUCER FUNCTION
// ============================================================

export function supportReducer(state: SupportState, action: SupportAction): SupportState {
  switch (action.type) {
    // ========== Pagination ==========
    case 'SET_PAGE':
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: action.payload },
      };

    case 'SET_PAGE_SIZE':
      return {
        ...state,
        pagination: {
          currentPage: 1,
          pageSize: action.payload,
        },
        selection: {
          selectedIds: new Set(),
          selectAll: false,
        },
      };

    case 'RESET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: 1 },
      };

    // ========== Sorting ==========
    case 'SET_SORT':
      return {
        ...state,
        sorting: action.payload,
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case 'TOGGLE_SORT':
      return {
        ...state,
        sorting: {
          column: action.payload,
          direction: state.sorting.column === action.payload && state.sorting.direction === 'asc' ? 'desc' : 'asc',
        },
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case 'RESET_SORT':
      return {
        ...state,
        sorting: {
          column: null,
          direction: 'asc',
        },
      };

    // ========== Filters ==========
    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        filters: { ...state.filters, category: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
        selection: { selectedIds: new Set(), selectAll: false },
      };

    case 'SET_URGENCY_FILTER':
      return {
        ...state,
        filters: { ...state.filters, urgency: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
        selection: { selectedIds: new Set(), selectAll: false },
      };

    case 'SET_SOURCE_FILTER':
      return {
        ...state,
        filters: { ...state.filters, source: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
        selection: { selectedIds: new Set(), selectAll: false },
      };

    case 'SET_DATE_FILTER':
      return {
        ...state,
        filters: { ...state.filters, date: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
        selection: { selectedIds: new Set(), selectAll: false },
      };

    case 'SET_DAY_FILTER':
      return {
        ...state,
        filters: { ...state.filters, day: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
        selection: { selectedIds: new Set(), selectAll: false },
      };

    case 'SET_SEARCH':
      return {
        ...state,
        filters: { ...state.filters, search: action.payload },
        pagination: { ...state.pagination, currentPage: 1 },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        sorting: { column: null, direction: 'asc' },
        filters: {
          category: [],
          urgency: [],
          source: [],
          date: 'all',
          day: [],
          search: '',
        },
      };

    case 'TOGGLE_FILTER_DISPLAY':
      return {
        ...state,
        ui: {
          ...state.ui,
          showFilters: {
            ...state.ui.showFilters,
            [action.payload]: !state.ui.showFilters[action.payload],
          },
        },
      };

    // ========== Selection ==========
    case 'SELECT_REQUEST': {
      const newSelectedIds = new Set(state.selection.selectedIds);
      newSelectedIds.add(action.payload);
      return {
        ...state,
        selection: {
          selectedIds: newSelectedIds,
          selectAll: false, // Will be updated by parent component if needed
        },
      };
    }

    case 'DESELECT_REQUEST': {
      const newSelectedIds = new Set(state.selection.selectedIds);
      newSelectedIds.delete(action.payload);
      return {
        ...state,
        selection: {
          selectedIds: newSelectedIds,
          selectAll: false,
        },
      };
    }

    case 'SELECT_ALL': {
      const newSelectedIds = new Set(action.payload);
      return {
        ...state,
        selection: {
          selectedIds: newSelectedIds,
          selectAll: true,
        },
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selection: {
          selectedIds: new Set(),
          selectAll: false,
        },
      };

    case 'SET_SELECT_ALL':
      return {
        ...state,
        selection: {
          ...state.selection,
          selectAll: action.payload,
        },
      };

    // ========== Bulk Edit ==========
    case 'STAGE_BULK_CATEGORY':
      return {
        ...state,
        bulkEdit: { ...state.bulkEdit, category: action.payload },
      };

    case 'STAGE_BULK_URGENCY':
      return {
        ...state,
        bulkEdit: { ...state.bulkEdit, urgency: action.payload },
      };

    case 'STAGE_BULK_HOURS':
      return {
        ...state,
        bulkEdit: { ...state.bulkEdit, hours: action.payload },
      };

    case 'CLEAR_STAGED_CHANGES':
      return {
        ...state,
        bulkEdit: {
          category: '',
          urgency: '',
          hours: null,
        },
      };

    // ========== UI ==========
    case 'TOGGLE_HIDE_NON_BILLABLE':
      return {
        ...state,
        ui: {
          ...state.ui,
          hideNonBillable: !state.ui.hideNonBillable,
        },
      };

    case 'SET_HIDE_NON_BILLABLE':
      return {
        ...state,
        ui: {
          ...state.ui,
          hideNonBillable: action.payload,
        },
      };

    case 'TOGGLE_SHOW_ARCHIVED':
      return {
        ...state,
        ui: {
          ...state.ui,
          showArchived: !state.ui.showArchived,
        },
      };

    case 'OPEN_DELETE_CONFIRMATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          deleteConfirmation: {
            isOpen: true,
            requestIndex: action.payload,
          },
        },
      };

    case 'CLOSE_DELETE_CONFIRMATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          deleteConfirmation: {
            isOpen: false,
            requestIndex: null,
          },
        },
      };

    // ========== Composite Actions ==========
    case 'FILTER_CHANGED':
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: 1 },
        selection: { selectedIds: new Set(), selectAll: false },
      };

    default:
      return state;
  }
}

// ============================================================
// HOOK
// ============================================================

/**
 * Custom hook for managing SupportTickets component state
 *
 * Replaces 15+ useState calls with a single unified state management solution.
 *
 * @returns State and action dispatchers
 */
export function useSupportReducer() {
  const [state, dispatch] = useReducer(supportReducer, undefined, getInitialState);

  // ========== Action Creators (Memoized) ==========

  const actions = {
    // Pagination
    setPage: useCallback((page: number) => dispatch({ type: 'SET_PAGE', payload: page }), []),
    setPageSize: useCallback((size: number) => dispatch({ type: 'SET_PAGE_SIZE', payload: size }), []),
    resetPagination: useCallback(() => dispatch({ type: 'RESET_PAGINATION' }), []),

    // Sorting
    setSort: useCallback((column: string, direction: 'asc' | 'desc') =>
      dispatch({ type: 'SET_SORT', payload: { column, direction } }), []),
    toggleSort: useCallback((column: string) => dispatch({ type: 'TOGGLE_SORT', payload: column }), []),
    resetSort: useCallback(() => dispatch({ type: 'RESET_SORT' }), []),

    // Filters
    setCategoryFilter: useCallback((categories: string[]) =>
      dispatch({ type: 'SET_CATEGORY_FILTER', payload: categories }), []),
    setUrgencyFilter: useCallback((urgencies: string[]) =>
      dispatch({ type: 'SET_URGENCY_FILTER', payload: urgencies }), []),
    setSourceFilter: useCallback((sources: string[]) =>
      dispatch({ type: 'SET_SOURCE_FILTER', payload: sources }), []),
    setDateFilter: useCallback((date: string) =>
      dispatch({ type: 'SET_DATE_FILTER', payload: date }), []),
    setDayFilter: useCallback((days: string[]) =>
      dispatch({ type: 'SET_DAY_FILTER', payload: days }), []),
    setSearch: useCallback((query: string) =>
      dispatch({ type: 'SET_SEARCH', payload: query }), []),
    resetFilters: useCallback(() => dispatch({ type: 'RESET_FILTERS' }), []),
    toggleFilterDisplay: useCallback((filter: keyof SupportState['ui']['showFilters']) =>
      dispatch({ type: 'TOGGLE_FILTER_DISPLAY', payload: filter }), []),

    // Selection
    selectRequest: useCallback((id: number) => dispatch({ type: 'SELECT_REQUEST', payload: id }), []),
    deselectRequest: useCallback((id: number) => dispatch({ type: 'DESELECT_REQUEST', payload: id }), []),
    selectAll: useCallback((ids: number[]) => dispatch({ type: 'SELECT_ALL', payload: ids }), []),
    clearSelection: useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []),
    setSelectAll: useCallback((selectAll: boolean) => dispatch({ type: 'SET_SELECT_ALL', payload: selectAll }), []),

    // Bulk Edit
    stageBulkCategory: useCallback((category: string) =>
      dispatch({ type: 'STAGE_BULK_CATEGORY', payload: category }), []),
    stageBulkUrgency: useCallback((urgency: string) =>
      dispatch({ type: 'STAGE_BULK_URGENCY', payload: urgency }), []),
    stageBulkHours: useCallback((hours: number | null) =>
      dispatch({ type: 'STAGE_BULK_HOURS', payload: hours }), []),
    clearStagedChanges: useCallback(() => dispatch({ type: 'CLEAR_STAGED_CHANGES' }), []),

    // UI
    toggleHideNonBillable: useCallback(() => dispatch({ type: 'TOGGLE_HIDE_NON_BILLABLE' }), []),
    setHideNonBillable: useCallback((hide: boolean) =>
      dispatch({ type: 'SET_HIDE_NON_BILLABLE', payload: hide }), []),
    toggleShowArchived: useCallback(() => dispatch({ type: 'TOGGLE_SHOW_ARCHIVED' }), []),
    openDeleteConfirmation: useCallback((index: number) =>
      dispatch({ type: 'OPEN_DELETE_CONFIRMATION', payload: index }), []),
    closeDeleteConfirmation: useCallback(() => dispatch({ type: 'CLOSE_DELETE_CONFIRMATION' }), []),

    // Composite
    filterChanged: useCallback(() => dispatch({ type: 'FILTER_CHANGED' }), []),
  };

  return {
    state,
    dispatch,
    actions,
  };
}
