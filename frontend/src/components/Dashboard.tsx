import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RequestCalendarHeatmap } from './RequestCalendarHeatmap';
import CategoryRadarChart from './CategoryRadarChart';
import { CategoryPieChart } from './CategoryPieChart';
import { Pagination } from './Pagination';
import { EditableCell } from './EditableCell';
import { ConfirmDialog } from './ConfirmDialog';
import type { ChatRequest } from '../types/request';
import { processDailyRequests, processCategoryData, calculateCosts, categorizeRequest, loadRequestData } from '../utils/dataProcessing';
import { formatTime } from '../utils/timeUtils';
import { saveToDataDirectory } from '../utils/csvExport';
import { fetchRequests, updateRequest as updateRequestAPI, bulkUpdateRequests, checkAPIHealth, deleteRequest } from '../utils/api';
import { DollarSign, Clock, AlertCircle, Download, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Info, Filter, Search, X, Trash2, RotateCcw, Archive, ChevronRight } from 'lucide-react';

export function Dashboard() {
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorkingVersion, setIsWorkingVersion] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('original');
  console.log(currentVersion); // Used for tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [dataSource, setDataSource] = useState<'api' | 'csv'>('csv');
  
  // Auto-save debounce timer
  const autoSaveTimeoutRef = useRef<number | null>(null);
  
  // Simplified auto-save function with debouncing
  const triggerAutoSave = useCallback(async (requestsToSave: ChatRequest[]) => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set up debounced auto-save (wait 2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setHasUnsavedChanges(true);
        // Pass all requests - the save function handles everything internally
        const result = await saveToDataDirectory(requestsToSave, []);
        
        if (result.success) {
          console.log('Auto-saved successfully');
          setIsWorkingVersion(true);
          setCurrentVersion('working');
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.warn('Auto-save failed:', error);
        setHasUnsavedChanges(false);
      }
    }, 2000); // 2 second debounce
  }, []);
  
  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  
  // Deleted requests functionality removed
  
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  
  // Date filtering state
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');
  
  // Time view mode for the chart
  const [timeViewMode, setTimeViewMode] = useState<'all' | 'month' | 'day'>('month');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column filter state - changed to arrays for multiple selections
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all'); // Keep as dropdown
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<{
    date: boolean;
    day: boolean;
    category: boolean;
    urgency: boolean;
  }>({
    date: false,
    day: false,
    category: false,
    urgency: false
  });

  // Bulk selection state
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Staged bulk changes
  const [stagedBulkCategory, setStagedBulkCategory] = useState<string>('');
  const [stagedBulkUrgency, setStagedBulkUrgency] = useState<string>('');

  // Search functionality
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Chart type toggle
  const [chartType, setChartType] = useState<'pie' | 'radar'>('radar');

  // Non-billable items visibility toggle
  const [hideNonBillable, setHideNonBillable] = useState<boolean>(() => {
    const saved = localStorage.getItem('hideNonBillable');
    return saved !== null ? JSON.parse(saved) : true; // Default to hiding non-billable items
  });

  // Delete confirmation dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    requestIndex: number | null;
  }>({
    isOpen: false,
    requestIndex: null
  });

  // Archive section visibility
  const [showArchived, setShowArchived] = useState(false);

  // Row expansion removed - request summaries now always wrap

  // Scroll position preservation
  const scrollPositionRef = useRef<number>(0);
  const shouldPreserveScrollRef = useRef<boolean>(false);

  // Dropdown options
  const urgencyOptions = ['Low', 'Medium', 'High'];
  const categoryOptions = ['Advisory', 'Email', 'Forms', 'General', 'Hosting', 'Migration', 'Non-billable', 'Support'];
  
  // Toggle individual column filter visibility
  const toggleColumnFilter = (column: 'date' | 'day' | 'category' | 'urgency') => {
    setShowFilters(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper function to parse time string (e.g., "7:10 PM") to comparable number
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;

    try {
      // Match both 12-hour format (e.g., "7:10 PM") and 24-hour format (e.g., "19:10:00")
      const twelveHourMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

      if (twelveHourMatch) {
        let hours = parseInt(twelveHourMatch[1]);
        const minutes = parseInt(twelveHourMatch[2]);
        const isPM = twelveHourMatch[3].toUpperCase() === 'PM';

        // Convert 12-hour to 24-hour format
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        return hours * 60 + minutes;
      }

      // Try 24-hour format
      const twentyFourHourMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (twentyFourHourMatch) {
        const hours = parseInt(twentyFourHourMatch[1]);
        const minutes = parseInt(twentyFourHourMatch[2]);
        return hours * 60 + minutes;
      }

      return 0;
    } catch {
      return 0;
    }
  };

  // Helper function to get day of week - fixed to avoid timezone issues
  const getDayOfWeek = (dateStr: string) => {
    // Parse date string (YYYY-MM-DD) manually to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date with explicit year, month (0-indexed), day to avoid UTC conversion
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Sorting function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle calendar date click to filter requests
  const handleCalendarDateClick = (date: string) => {
    // Parse the date string (format: YYYY-MM-DD)
    const [year, month] = date.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Update the filters to show only this date
    setSelectedYear(yearNum);
    setSelectedMonth(monthNum);
    setSelectedDay(date);

    // Switch to day view mode
    setTimeViewMode('day');

    // Reset pagination to first page
    setCurrentPage(1);

    // Clear any column filters that might interfere
    setDateFilter(date);
  };

  // Handle back to calendar view
  const handleBackToCalendar = () => {
    // Reset to all months view
    setTimeViewMode('all');
    // Reset month to show all
    setSelectedMonth('all');
    // Clear the day selection
    setSelectedDay('all');
    // Clear the date filter
    setDateFilter('all');
  };

  // Sort icon component
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  // Get billable and non-billable requests (based on Category instead of Status)
  const billableRequests = requests.filter(request => request.Category !== 'Non-billable' && request.Category !== 'Migration');
  const nonBillableRequests = requests.filter(request => request.Category === 'Non-billable' || request.Category === 'Migration');

  // Get archived requests
  const archivedRequests = requests.filter(request => request.Status === 'deleted');

  // Calculate available years and months from all data (billable and non-billable)
  const availableYears = Array.from(new Set(
    requests.map(request => new Date(request.Date).getFullYear())
  )).sort((a, b) => b - a); // Sort descending (newest first)

  const availableMonthsForYear = Array.from(new Set(
    requests
      .filter(request => new Date(request.Date).getFullYear() === selectedYear)
      .map(request => new Date(request.Date).getMonth() + 1)
  )).sort((a, b) => a - b); // Sort ascending (Jan to Dec)

  // Get available dates from filtered requests (by year/month)
  const availableDates = Array.from(new Set(
    requests
      .filter(request => {
        const requestDate = new Date(request.Date);
        const requestYear = requestDate.getFullYear();
        const requestMonth = requestDate.getMonth() + 1;
        
        if (requestYear !== selectedYear) return false;
        if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
        
        return true;
      })
      .map(request => request.Date)
  )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // Sort chronologically (oldest first)

  useEffect(() => {
    // Load data from CSV
    loadData();
  }, []);

  // Save hideNonBillable preference to localStorage
  useEffect(() => {
    localStorage.setItem('hideNonBillable', JSON.stringify(hideNonBillable));
  }, [hideNonBillable]);

  // Set initial year when data loads
  useEffect(() => {
    if (requests.length > 0 && availableYears.length > 0) {
      // Only set if current year is not available
      if (!availableYears.includes(selectedYear)) {
        setSelectedYear(availableYears[0]); // Most recent year
      }
    }
  }, [requests, availableYears, selectedYear]);



  // Note: Deleted requests are now handled via Status field in main dataset
  // No need for separate loading logic

  // Note: CSV parsing for deleted requests removed - now handled via Status field

  const loadData = async () => {
    console.log('Dashboard loadData starting...');
    try {
      // First, check if API is available
      const apiHealthy = await checkAPIHealth();
      console.log('API health check result:', apiHealthy);
      console.log('API URL being used:', import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

      if (apiHealthy) {
        // Use API to load data
        console.log('Loading data from API...');
        setDataSource('api');
        setApiAvailable(true);

        // Fetch all requests regardless of status
        const apiRequests = await fetchRequests({ status: 'all' });
        console.log('Received from API:', { count: apiRequests.length, sample: apiRequests[0] });

        // Keep ALL requests (including deleted) for archive functionality
        setRequests(apiRequests);
        setIsWorkingVersion(false);
        setCurrentVersion('database');
      } else {
        // Fall back to CSV loading
        console.log('API not available, loading from CSV...');
        setDataSource('csv');
        setApiAvailable(false);

        const result = await loadRequestData();
        console.log('Received result:', { dataLength: result.data.length, version: result.version, isWorking: result.isWorking });

        setIsWorkingVersion(result.isWorking);
        setCurrentVersion(result.version);

        // Convert to ChatRequest format for compatibility
        const requestData: ChatRequest[] = result.data.map(item => ({
          Date: item.date,
          Time: item.time,
          Request_Summary: item.description,
          Category: item.category,
          Urgency: item.urgency,
          EstimatedHours: item.effort === 'Small' ? 0.25 : item.effort === 'Large' ? 1.0 : 0.5
        }));

        console.log('Converted to ChatRequest format:', { count: requestData.length, sample: requestData[0] });

        // Save original data as backup (only if not already saved and not working version)
        if (!localStorage.getItem('originalRequestsBackup') && !result.isWorking) {
          localStorage.setItem('originalRequestsBackup', JSON.stringify(requestData));
        }

        setRequests(requestData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      // Use sample data for development
      const sampleData: ChatRequest[] = [
        {
          Date: '2025-05-15',
          Time: '07:14 AM',
          Request_Summary: 'Up to 36 websites now and still counting that I\'ll need help migrating',
          Urgency: 'HIGH',
          Category: 'Migration'
        }
      ];
      setRequests(sampleData);
      setLoading(false);
    }
  };


  // Filter and sort requests by selected year, month, day, column filters, and search query
  const filteredAndSortedRequests = (() => {
    // First filter by year, month, day, column filters, and search query
    const filtered = requests.filter(request => {
      // Exclude deleted items from main table (only show active items)
      if (request.Status === 'deleted') return false;

      const requestDate = new Date(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1; // JavaScript months are 0-indexed
      const requestDayOfWeek = getDayOfWeek(request.Date);

      // Apply non-billable filter if toggle is on
      if (hideNonBillable) {
        const isNonBillable = request.Category === 'Non-billable' || request.Category === 'Migration';
        if (isNonBillable) return false;
      }

      // Date/time filters
      if (requestYear !== selectedYear) return false;
      if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
      if (selectedDay !== 'all' && request.Date !== selectedDay) return false;

      // Column filters - updated for checkbox arrays
      if (categoryFilter.length > 0 && !categoryFilter.includes(request.Category || 'Support')) return false;
      if (urgencyFilter.length > 0 && !urgencyFilter.includes(request.Urgency)) return false;
      if (dateFilter !== 'all' && request.Date !== dateFilter) return false;
      if (dayFilter.length > 0 && !dayFilter.includes(requestDayOfWeek)) return false;

      // Search filter - case-insensitive search in Request_Summary
      if (searchQuery.trim() !== '') {
        const searchLower = searchQuery.toLowerCase();
        const summary = request.Request_Summary?.toLowerCase() || '';
        if (!summary.includes(searchLower)) return false;
      }

      return true;
    });

    // Then sort with multi-level sorting (always maintain chronological order as secondary)
    if (!sortColumn) return filtered;

    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortColumn) {
        case 'Date':
          aValue = new Date(a.Date);
          bValue = new Date(b.Date);
          break;
        case 'DayOfWeek':
          aValue = getDayOfWeek(a.Date);
          bValue = getDayOfWeek(b.Date);
          break;
        case 'Time':
          aValue = parseTimeToMinutes(a.Time);
          bValue = parseTimeToMinutes(b.Time);
          break;
        case 'Request_Summary':
          aValue = a.Request_Summary.toLowerCase();
          bValue = b.Request_Summary.toLowerCase();
          break;
        case 'Category':
          aValue = (a.Category || categorizeRequest(a.Request_Summary)).toLowerCase();
          bValue = (b.Category || categorizeRequest(b.Request_Summary)).toLowerCase();
          break;
        case 'Urgency':
          // Sort by urgency level: HIGH > MEDIUM > LOW
          const urgencyOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          aValue = urgencyOrder[a.Urgency as keyof typeof urgencyOrder] || 0;
          bValue = urgencyOrder[b.Urgency as keyof typeof urgencyOrder] || 0;
          break;
        default:
          return 0;
      }

      // Primary sort by selected column
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;

      // If primary values are equal, maintain chronological order
      // Secondary sort by date (always ascending for consistency)
      const dateA = new Date(a.Date);
      const dateB = new Date(b.Date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;

      // If dates are also equal, tertiary sort by time (always ascending)
      const timeA = parseTimeToMinutes(a.Time);
      const timeB = parseTimeToMinutes(b.Time);
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;

      return 0;
    });
  })();

  // Recalculate derived data based on billable requests only
  const billableFilteredRequests = billableRequests.filter(request => {
    const requestDate = new Date(request.Date);
    const requestYear = requestDate.getFullYear();
    const requestMonth = requestDate.getMonth() + 1;
    
    if (requestYear !== selectedYear) return false;
    if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
    
    return true;
  });
  
  // Process hourly data for day view
  const processHourlyRequests = (requests: ChatRequest[], targetDate: string) => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      date: `${hour.toString().padStart(2, '0')}:00`,
      count: 0,
      low: 0,
      medium: 0,
      high: 0
    }));

    try {
      requests
        .filter(request => request.Date === targetDate)
        .forEach(request => {
          // Parse time (e.g., "07:14 AM" or "11:30 PM")
          const timeStr = request.Time;
          let hour = 0;
          
          if (timeStr) {
            try {
              // First try to parse 12-hour format (e.g., "4:55 PM")
              const twelveHourParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
              if (twelveHourParts) {
                hour = parseInt(twelveHourParts[1]);
                const isPM = twelveHourParts[3].toUpperCase() === 'PM';
                if (isPM && hour !== 12) hour += 12;
                if (!isPM && hour === 12) hour = 0;
              } else {
                // Try to parse 24-hour format (e.g., "16:55:44" or "16:55")
                const twentyFourHourParts = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                if (twentyFourHourParts) {
                  hour = parseInt(twentyFourHourParts[1]);
                }
              }
              
              // Ensure hour is within valid range
              if (hour < 0 || hour > 23) hour = 0;
            } catch (parseError) {
              console.warn('Error parsing time:', timeStr, parseError);
              hour = 0;
            }
          }

          if (hourlyData[hour]) {
            const hourData = hourlyData[hour];
            hourData.count++;
            
            switch (request.Urgency) {
              case 'HIGH':
                hourData.high++;
                break;
              case 'MEDIUM':
                hourData.medium++;
                break;
              case 'LOW':
                hourData.low++;
                break;
            }
          }
        });
    } catch (error) {
      console.error('Error processing hourly requests:', error);
      return [];
    }

    // Return all 24 hours, not just ones with data, for proper chart display
    return hourlyData;
  };


  // Choose chart data based on time view mode
  const getChartData = () => {
    try {
      if (timeViewMode === 'day' && selectedDay !== 'all') {
        // Use billableRequests for hourly view too, to be consistent
        return processHourlyRequests(billableRequests, selectedDay);
      } else {
        return processDailyRequests(billableFilteredRequests);
      }
    } catch (error) {
      console.error('Error getting chart data:', error);
      return [];
    }
  };

  const chartData = getChartData();
  const filteredCategoryData = processCategoryData(billableFilteredRequests);
  // Create category data for charts that ALWAYS includes ALL categories (unaffected by hideNonBillable toggle)
  // This filters by date/time but NOT by non-billable status
  const allRequestsForCharts = requests.filter(request => {
    const requestDate = new Date(request.Date);
    const requestYear = requestDate.getFullYear();
    const requestMonth = requestDate.getMonth() + 1;

    if (requestYear !== selectedYear) return false;
    if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
    if (selectedDay !== 'all' && request.Date !== selectedDay) return false;

    return true;
  });
  const allCategoryDataForCharts = processCategoryData(allRequestsForCharts);
  const filteredCosts = calculateCosts(billableFilteredRequests);
  

  // Scroll position preservation effect
  useEffect(() => {
    if (shouldPreserveScrollRef.current) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: 'auto' });
        shouldPreserveScrollRef.current = false;
      });
    }
  }, [filteredAndSortedRequests, chartData, filteredCategoryData, filteredCosts]);

  // Pagination calculations (based on sorted and filtered data)
  const totalPages = pageSize === filteredAndSortedRequests.length ? 1 : Math.ceil(filteredAndSortedRequests.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = pageSize === filteredAndSortedRequests.length ? filteredAndSortedRequests.length : Math.min(startIndex + pageSize, filteredAndSortedRequests.length);
  const paginatedRequests = pageSize === filteredAndSortedRequests.length ? filteredAndSortedRequests : filteredAndSortedRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedRequestIds(new Set()); // Clear selections when changing page
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when changing page
  };

  const handlePageSizeChange = (size: number | 'all') => {
    if (size === 'all') {
      setPageSize(filteredAndSortedRequests.length);
    } else {
      setPageSize(size);
    }
    setCurrentPage(1); // Reset to first page when changing page size
    setSelectedRequestIds(new Set()); // Clear selections when changing page size
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when changing page size
  };

  const updateRequest = async (index: number, field: keyof ChatRequest, value: string) => {
    console.log(`Dashboard updateRequest called: index=${index}, field=${field}, value=${value}`);
    preserveScrollPosition();
    const newRequests = [...requests];
    // Convert display values back to stored values for Urgency
    let actualValue = value;
    if (field === 'Urgency') {
      actualValue = value.toUpperCase();
    }

    console.log(`Before update - current value: ${newRequests[index][field]}, new value: ${actualValue}`);
    newRequests[index] = { ...newRequests[index], [field]: actualValue };
    setRequests(newRequests);

    // If API is available, update in database
    if (apiAvailable && newRequests[index].id) {
      try {
        await updateRequestAPI(newRequests[index].id, { [field]: actualValue });
        console.log(`Updated request ${index} in database: ${field} = ${actualValue}`);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to update in database:', error);
        setHasUnsavedChanges(true);
      }
    } else {
      // CSV mode - mark as having unsaved changes
      setHasUnsavedChanges(true);
      console.log(`Updated request ${index} locally: ${field} = ${actualValue}`);
    }
  };

  const handleDeleteRequest = (index: number) => {
    setDeleteConfirmation({
      isOpen: true,
      requestIndex: index
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.requestIndex === null) return;

    const requestToDelete = requests[deleteConfirmation.requestIndex];

    if (apiAvailable && requestToDelete.id) {
      // API mode - soft delete by updating status
      try {
        await deleteRequest(requestToDelete.id, false); // false = soft delete

        // Update local state - mark as deleted instead of removing
        const newRequests = [...requests];
        newRequests[deleteConfirmation.requestIndex] = {
          ...requestToDelete,
          Status: 'deleted'
        };
        setRequests(newRequests);

        console.log(`Request ${requestToDelete.id} marked as deleted`);
      } catch (error) {
        console.error('Failed to delete request:', error);
      }
    } else {
      // CSV mode - remove from array (original behavior)
      const newRequests = [...requests];
      newRequests.splice(deleteConfirmation.requestIndex, 1);
      setRequests(newRequests);
      triggerAutoSave(newRequests);
    }

    setDeleteConfirmation({
      isOpen: false,
      requestIndex: null
    });

    // Clear selection if deleted item was selected
    if (selectedRequestIds.has(deleteConfirmation.requestIndex)) {
      const newSelection = new Set(selectedRequestIds);
      newSelection.delete(deleteConfirmation.requestIndex);
      setSelectedRequestIds(newSelection);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      requestIndex: null
    });
  };

  const handleRestoreRequest = async (requestId: number | undefined, index: number) => {
    if (!requestId) return;

    try {
      // Update status back to active via API
      await updateRequestAPI(requestId, { Status: 'active' });

      // Update local state
      const newRequests = [...requests];
      newRequests[index] = {
        ...newRequests[index],
        Status: 'active'
      };
      setRequests(newRequests);

      console.log(`Request ${requestId} restored to active`);
    } catch (error) {
      console.error('Failed to restore request:', error);
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (apiAvailable) {
        // API mode - changes are already saved in real-time
        console.log('Changes already saved to database');
        setHasUnsavedChanges(false);
      } else {
        // CSV mode - save to file
        await saveToDataDirectory(requests, []);
        console.log('Successfully saved working version');
        setHasUnsavedChanges(false);
        setIsWorkingVersion(true);
      }
    } catch (error) {
      console.warn('Save failed:', error);
      setHasUnsavedChanges(false);
    }
  };

  // Delete-related functions removed - now using Non-billable category system

  // Bulk selection handlers
  // Track last selected index for shift-click range selection
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleSelectRequest = (index: number, event?: React.MouseEvent | MouseEvent) => {
    const newSelected = new Set(selectedRequestIds);
    
    // Check for modifier keys
    const isCtrlOrCmd = event?.ctrlKey || event?.metaKey; // Ctrl (PC) or Cmd (Mac)
    const isShift = event?.shiftKey;
    
    if (isShift && lastSelectedIndex !== null) {
      // Shift-click: select range from last selected to current
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      for (let i = start; i <= end; i++) {
        newSelected.add(i);
      }
      setSelectedRequestIds(newSelected);
      // Don't update lastSelectedIndex for shift-click to maintain range anchor
    } else if (isCtrlOrCmd) {
      // Ctrl/Cmd-click: toggle individual item
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedRequestIds(newSelected);
      setLastSelectedIndex(index);
    } else {
      // Regular click: toggle single item (existing behavior)
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedRequestIds(newSelected);
      setLastSelectedIndex(index);
    }
    
    // Update selectAll state based on visible page selection
    const visibleIndices = paginatedRequests.map((_, paginatedIndex) => startIndex + paginatedIndex);
    const selectedVisibleCount = visibleIndices.filter(idx => newSelected.has(idx)).length;
    setSelectAll(selectedVisibleCount === paginatedRequests.length && paginatedRequests.length > 0);
  };

  // Handle row click for selection (avoiding conflicts with interactive elements)
  const handleRowClick = (index: number, event: React.MouseEvent) => {
    // Don't select if clicking on interactive elements
    const target = event.target as HTMLElement;
    const isInteractive = target.closest('input, button, select, a, [role="button"]') || 
                          target.tagName === 'INPUT' || 
                          target.tagName === 'BUTTON' || 
                          target.tagName === 'SELECT' ||
                          target.tagName === 'A' ||
                          target.getAttribute('role') === 'button';
    
    if (!isInteractive) {
      handleSelectRequest(index, event);
    }
  };

  const handleSelectAll = () => {
    if (selectAll || selectedRequestIds.size === paginatedRequests.length) {
      // Deselect all
      setSelectedRequestIds(new Set());
      setSelectAll(false);
    } else {
      // Select only visible/paginated requests (current page)
      const allIds = new Set<number>();
      paginatedRequests.forEach((_, paginatedIndex) => {
        allIds.add(startIndex + paginatedIndex);
      });
      setSelectedRequestIds(allIds);
      setSelectAll(true);
    }
  };

  // Bulk delete function removed - now using Non-billable category system

  // Apply staged bulk changes
  const applyBulkChanges = async () => {
    if (selectedRequestIds.size === 0) return;
    if (!stagedBulkCategory && !stagedBulkUrgency) return;

    preserveScrollPosition();
    const newRequests = [...requests];
    const idsToUpdate: number[] = [];

    // Apply staged changes to selected requests
    selectedRequestIds.forEach(index => {
      const updatedRequest = { ...newRequests[index] };

      if (stagedBulkCategory) {
        updatedRequest.Category = stagedBulkCategory;
      }

      if (stagedBulkUrgency) {
        updatedRequest.Urgency = stagedBulkUrgency.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
      }

      newRequests[index] = updatedRequest;

      if (updatedRequest.id) {
        idsToUpdate.push(updatedRequest.id!);
      }
    });

    setRequests(newRequests);

    // Build update payload
    const updatePayload: any = {};
    if (stagedBulkCategory) updatePayload.Category = stagedBulkCategory;
    if (stagedBulkUrgency) updatePayload.Urgency = stagedBulkUrgency.toUpperCase();

    // If API is available, update in database
    if (apiAvailable && idsToUpdate.length > 0 && Object.keys(updatePayload).length > 0) {
      try {
        await bulkUpdateRequests(idsToUpdate, updatePayload);
        console.log(`Updated ${idsToUpdate.length} requests in database`);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to bulk update in database:', error);
        setHasUnsavedChanges(true);
      }
    } else {
      // CSV mode or no IDs - mark as having unsaved changes
      setHasUnsavedChanges(true);
      console.log(`Updated ${selectedRequestIds.size} requests locally`);
      triggerAutoSave(newRequests);
    }

    // Clear selections and staged changes after applying
    setSelectedRequestIds(new Set());
    setSelectAll(false);
    setStagedBulkCategory('');
    setStagedBulkUrgency('');
  };

  // Clear staged changes
  const clearStagedChanges = () => {
    setStagedBulkCategory('');
    setStagedBulkUrgency('');
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setCurrentPage(1); // Reset pagination when filter changes
    setSelectedRequestIds(new Set()); // Clear selections when filter changes
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when filter changes
    
    // Reset month to 'all' when changing years to avoid invalid month selections
    setSelectedMonth('all');
    
    // Reset column filters
    setCategoryFilter([]);
    setUrgencyFilter([]);
    setDateFilter('all');
    setDayFilter([]);
  };

  const handleMonthChange = (month: number | 'all') => {
    setSelectedMonth(month);
    setCurrentPage(1); // Reset pagination when filter changes
    setSelectedRequestIds(new Set()); // Clear selections when filter changes
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when filter changes
    setSelectedDay('all'); // Reset day filter when changing month
    
    // Reset some column filters (keep category and urgency as they span across months)
    setDateFilter('all');
    setDayFilter([]);
    
    // Auto-adjust time view mode
    if (month === 'all') {
      setTimeViewMode('all');
    } else {
      setTimeViewMode('month');
    }
  };

  const handleDayChange = (day: string | 'all') => {
    setSelectedDay(day);
    setCurrentPage(1); // Reset pagination when filter changes
    setSelectedRequestIds(new Set()); // Clear selections when filter changes
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when filter changes
    
    // Reset some column filters when changing specific day selection
    setDateFilter('all');
    setDayFilter([]);
    
    // Auto-adjust time view mode
    if (day === 'all') {
      setTimeViewMode(selectedMonth === 'all' ? 'all' : 'month');
    } else {
      setTimeViewMode('day');
    }
  };

  const handleTimeViewModeChange = (mode: 'all' | 'month' | 'day') => {
    setTimeViewMode(mode);
    // Auto-adjust filters based on view mode
    if (mode === 'all') {
      setSelectedMonth('all');
      setSelectedDay('all');
    } else if (mode === 'month') {
      setSelectedDay('all');
      if (selectedMonth === 'all' && availableMonthsForYear.length > 0) {
        setSelectedMonth(availableMonthsForYear[availableMonthsForYear.length - 1]); // Most recent month
      }
    } else if (mode === 'day') {
      if (selectedDay === 'all' && availableDates.length > 0) {
        setSelectedDay(availableDates[0]); // Most recent day
      }
    }
  };

  const resetTableFilters = () => {
    setSortColumn(null);
    setSortDirection('asc');
    setCurrentPage(1);
    // Reset column filters
    setCategoryFilter([]);
    setUrgencyFilter([]);
    setDateFilter('all');
    setDayFilter([]);
    // Reset search
    setSearchQuery('');
  };

  const formatUrgencyDisplay = (urgency: string) => {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase();
  };

  // Row expansion functionality removed - summaries now always wrap

  // Helper function to preserve scroll position during state changes
  const preserveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
    shouldPreserveScrollRef.current = true;
  };


  const getUniqueUrgencies = () => {
    return ['HIGH', 'MEDIUM', 'LOW'];
  };

  const getUniqueDates = () => {
    const dates = Array.from(new Set(
      requests
        .filter(request => {
          const requestDate = new Date(request.Date);
          const requestYear = requestDate.getFullYear();
          const requestMonth = requestDate.getMonth() + 1;
          if (requestYear !== selectedYear) return false;
          if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
          return true;
        })
        .map(request => request.Date)
    )).sort();
    return dates;
  };

  const getUniqueDays = () => {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  };


  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div>
      {/* Sticky Header with Title and Controls - Full Width */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="container mx-auto py-4">
          <div className="flex items-start justify-between">
            {/* Left side - Title */}
            <h1 className="text-3xl font-bold tracking-tight">Request Analysis Dashboard</h1>

            {/* Right side - Controls */}
            <div className="flex items-center space-x-6">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 bg-white text-sm min-w-[70px]"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                
                <span className="text-gray-400">→</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 bg-white text-sm min-w-[90px]"
                >
                  <option value="all">All Months</option>
                  {availableMonthsForYear.map(month => (
                    <option key={month} value={month}>
                      {monthNames[month - 1]}
                    </option>
                  ))}
                </select>
                
                {selectedMonth !== 'all' && (
                  <>
                    <span className="text-gray-400">→</span>
                    <select
                      value={selectedDay}
                      onChange={(e) => handleDayChange(e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1 bg-white text-sm min-w-[100px]"
                    >
                      <option value="all">All Days</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">View:</span>
              <div className="inline-flex rounded-md" role="group">
                {[
                  { mode: 'all' as const, label: 'All' },
                  { mode: 'month' as const, label: 'Month' },
                  { mode: 'day' as const, label: 'Day' }
                ].map((item, index, array) => (
                  <button
                    key={item.mode}
                    onClick={() => handleTimeViewModeChange(item.mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      timeViewMode === item.mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                    } ${
                      index === 0 ? 'rounded-l-md' :
                      index === array.length - 1 ? 'rounded-r-md' : ''
                    } border ${
                      index > 0 ? 'border-l-0' : ''
                    } ${
                      timeViewMode === item.mode ? 'border-blue-600' : 'border-gray-300'
                    }`}
                    title={`View by ${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-6">
        {/* Info section - Not sticky */}
        <div className="space-y-2">
        <p className="text-muted-foreground">
          Analysis of support requests from Thad Norman ({billableFilteredRequests.length} billable filtered, {billableRequests.length} total billable, {requests.length} total requests)
          {nonBillableRequests.length > 0 && (
            <span className="text-gray-600"> • {nonBillableRequests.length} non-billable</span>
          )}
          {hideNonBillable && nonBillableRequests.length > 0 && (
            <span className="text-orange-600 font-medium"> • Hiding {nonBillableRequests.length} non-billable items</span>
          )}
        </p>
        <div className="flex items-center space-x-3">
          {dataSource === 'api' ? (
            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
              <Info className="w-3 h-3" />
              <span>Connected to Database</span>
            </div>
          ) : isWorkingVersion ? (
            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
              <Info className="w-3 h-3" />
              <span>Working Version (CSV)</span>
            </div>
          ) : null}
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs">
              <Clock className="w-3 h-3" />
              <span>Unsaved changes - click Save button</span>
            </div>
          )}
          {!apiAvailable && (
            <span className="text-xs text-gray-500">
              Manual save required • Original data protected
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billableFilteredRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              {timeViewMode === 'day' && selectedDay !== 'all' 
                ? `Across ${chartData.length} hours`
                : `Across ${chartData.length} days`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCosts ? (filteredCosts.regularHours + filteredCosts.sameDayHours + filteredCosts.emergencyHours).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              At 0.5 hours per request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                ${filteredCosts?.flatRateCost.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground line-through">
                ${filteredCosts?.totalCost.toLocaleString() || 0}
              </div>
              <div className="text-sm font-semibold text-green-600">
                Save ${filteredCosts?.savings.toLocaleString() || 0}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Flat rate ($125/hr)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billableFilteredRequests.filter(r => r.Urgency === 'HIGH').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {billableFilteredRequests.length > 0 ? Math.round((billableFilteredRequests.filter(r => r.Urgency === 'HIGH').length / billableFilteredRequests.length) * 100) : 0}% of billable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Over Time - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>
            {timeViewMode === 'day' && selectedDay !== 'all'
              ? (() => {
                  try {
                    return `Requests by Hour - ${new Date(selectedDay).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}`;
                  } catch (error) {
                    return `Requests by Hour - ${selectedDay}`;
                  }
                })()
              : timeViewMode === 'month' && selectedMonth !== 'all'
              ? `Request Calendar - ${monthNames[selectedMonth - 1]} ${selectedYear}`
              : 'Request Calendar Overview'
            }
          </CardTitle>
          <CardDescription>
            {timeViewMode === 'day' && selectedDay !== 'all'
              ? 'Hourly view not available in calendar format'
              : 'Daily request intensity shown as color-coded calendar grid'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestCalendarHeatmap
            data={chartData}
            isHourlyView={timeViewMode === 'day' && selectedDay !== 'all'}
            onDateClick={handleCalendarDateClick}
            selectedDate={selectedDay === 'all' ? undefined : selectedDay}
            onBackToCalendar={handleBackToCalendar}
            isSingleMonth={selectedMonth !== 'all'}
          />
        </CardContent>
      </Card>

      {/* Charts and Cost Breakdown Side by Side */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Categories</CardTitle>
            <CardDescription>Distribution of request types</CardDescription>
            <div className="flex gap-1 mt-2">
              <button
                className={`px-3 py-1 text-xs rounded-l-md transition-colors ${
                  chartType === 'pie'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setChartType('pie')}
              >
                Pie
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-r-md transition-colors ${
                  chartType === 'radar'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setChartType('radar')}
              >
                Radar
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {chartType === 'radar' ? (
              <CategoryRadarChart data={allCategoryDataForCharts} />
            ) : (
              <CategoryPieChart data={allCategoryDataForCharts} />
            )}
          </CardContent>
        </Card>

        {filteredCosts && (
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Cost Calculation</CardTitle>
              <CardDescription>Tiered pricing vs flat rate comparison (0.5 hour increments)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div></div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 items-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Regular Support ($200/hr)</p>
                  <p className="text-2xl font-bold">{filteredCosts.regularHours} hours</p>
                  <p className="text-lg">${filteredCosts.regularCost.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Same Day ($250/hr)</p>
                  <p className="text-2xl font-bold">{filteredCosts.sameDayHours} hours</p>
                  <p className="text-lg">${filteredCosts.sameDayCost.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Emergency ($300/hr)</p>
                  <p className="text-2xl font-bold">{filteredCosts.emergencyHours} hours</p>
                  <p className="text-lg">${filteredCosts.emergencyCost.toLocaleString()}</p>
                </div>
              </div>
              <div className="px-6 py-4 -mx-6 mt-8 border-t bg-gray-50">
                <div className="flex justify-between items-center w-full">
                  <p className="text-lg font-semibold">Total (Tiered Pricing)</p>
                  <p className="text-lg font-semibold">{(filteredCosts.regularHours + filteredCosts.sameDayHours + filteredCosts.emergencyHours).toFixed(1)} hours</p>
                  <p className="text-lg font-semibold">${filteredCosts.totalCost.toLocaleString()}</p>
                </div>
              </div>

              {/* Flat Rate Pricing with Savings */}
              <div className="px-6 py-4 -mx-6 -mb-6 border-t bg-green-50">
                <div className="flex justify-between items-center w-full mb-3">
                  <p className="text-lg font-semibold text-green-800">Flat Rate ($125/hr)</p>
                  <p className="text-lg font-semibold text-green-800">{filteredCosts.flatRateHours.toFixed(1)} hours</p>
                  <p className="text-lg font-semibold text-green-800">${filteredCosts.flatRateCost.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center w-full pt-3 border-t border-green-200">
                  <p className="text-lg font-bold text-green-700">Your Savings</p>
                  <p className="text-lg font-bold text-green-700">
                    ${filteredCosts.savings.toLocaleString()} ({filteredCosts.savingsPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Table */}
      <Card>
        {/* Sticky Header for Billable Requests */}
        <CardHeader className="sticky top-16 z-30 bg-white border-b border-gray-200">
          <div className="space-y-3">
            {/* Title Row */}
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Billable Requests</CardTitle>
                <CardDescription>Complete list of support requests - click category or urgency to edit</CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                {/* Toggle for Non-Billable Items */}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideNonBillable}
                    onChange={(e) => setHideNonBillable(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="relative">
                    <div className={`block w-10 h-6 rounded-full transition-colors ${hideNonBillable ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform ${hideNonBillable ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Hide Non-Billable
                  </span>
                </label>
                {hasUnsavedChanges && dataSource === 'csv' && (
                  <button
                    onClick={handleSaveChanges}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Selection UI - Moved here from CardContent */}
            {selectedRequestIds.size > 0 && (
              <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedRequestIds.size} selected{selectedRequestIds.size === paginatedRequests.length && paginatedRequests.length < filteredAndSortedRequests.length ? ' (current page)' : ''}:
                </span>

                {/* Note: Delete functionality removed - use Non-billable category instead */}

                {/* Bulk Category Change */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600">Category:</span>
                  <select
                    value={stagedBulkCategory}
                    onChange={(e) => setStagedBulkCategory(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[100px]"
                  >
                    <option value="">Change to...</option>
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk Urgency Change */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600">Urgency:</span>
                  <select
                    value={stagedBulkUrgency}
                    onChange={(e) => setStagedBulkUrgency(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[90px]"
                  >
                    <option value="">Change to...</option>
                    {urgencyOptions.map(urgency => (
                      <option key={urgency} value={urgency}>{urgency}</option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                {(stagedBulkCategory || stagedBulkUrgency) ? (
                  <>
                    <button
                      onClick={applyBulkChanges}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors font-medium"
                    >
                      Apply Changes
                    </button>
                    <button
                      onClick={clearStagedChanges}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRequestIds(new Set());
                      setSelectAll(false);
                      clearStagedChanges();
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-visible">
          {/* Table Actions */}
          <div className="flex items-center justify-between mb-4 pt-4">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {(sortColumn !== null || categoryFilter.length > 0 || urgencyFilter.length > 0 || dateFilter !== 'all' || dayFilter.length > 0 || searchQuery !== '') && (
                <button
                  onClick={resetTableFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <span>Showing {filteredAndSortedRequests.length} requests</span>
            </div>
          </div>

          <div className="overflow-visible" style={{position: 'static'}}>
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 focus:ring-blue-500"
                    title="Select all visible requests on this page"
                  />
                </TableHead>
                <TableHead>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('date')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle date filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.date ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleSort('Date')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>Date</span>
                        {getSortIcon('Date')}
                      </button>
                    </div>
                    {showFilters.date && (
                      <select
                        value={dateFilter}
                        onChange={(e) => {
                          preserveScrollPosition();
                          setDateFilter(e.target.value);
                          setCurrentPage(1);
                          setSelectedRequestIds(new Set());
                          setSelectAll(false);
                        }}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                      >
                        <option value="all">All Dates</option>
                        {getUniqueDates().map(date => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('day')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle day filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.day ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleSort('DayOfWeek')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>Day</span>
                        {getSortIcon('DayOfWeek')}
                      </button>
                    </div>
                    {showFilters.day && (
                      <div className="w-full text-xs border border-gray-300 rounded p-2 bg-white">
                        {getUniqueDays().map(day => (
                          <label key={day} className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dayFilter.includes(day)}
                              onChange={(e) => {
                                preserveScrollPosition();
                                const newFilter = e.target.checked
                                  ? [...dayFilter, day]
                                  : dayFilter.filter(d => d !== day);
                                setDayFilter(newFilter);
                                setCurrentPage(1);
                                setSelectedRequestIds(new Set());
                                setSelectAll(false);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <span>{day}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('Time')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>Time</span>
                    {getSortIcon('Time')}
                  </button>
                </TableHead>
                <TableHead>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSort('Request_Summary')}
                      className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                    >
                      <span>Request Summary</span>
                      {getSortIcon('Request_Summary')}
                    </button>
                    <div 
                      className="flex items-center space-x-1 cursor-help hover:text-blue-600 transition-colors"
                      title="Full request text is always visible with line wrapping"
                    >
                      <Info className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('category')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle category filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.category ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleSort('Category')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>Category</span>
                        {getSortIcon('Category')}
                      </button>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </div>
                    {showFilters.category && (
                      <div className="w-full text-xs border border-gray-300 rounded p-2 bg-white max-h-40 overflow-y-auto">
                        {categoryOptions.map(category => {
                          // Count how many items have this category in the current view
                          const count = requests.filter(request => {
                            const requestDate = new Date(request.Date);
                            const requestYear = requestDate.getFullYear();
                            const requestMonth = requestDate.getMonth() + 1;
                            if (requestYear !== selectedYear) return false;
                            if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
                            if (selectedDay !== 'all' && request.Date !== selectedDay) return false;
                            return request.Category === category;
                          }).length;

                          return (
                            <label key={category} className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={categoryFilter.includes(category)}
                                onChange={(e) => {
                                  preserveScrollPosition();
                                  const newFilter = e.target.checked
                                    ? [...categoryFilter, category]
                                    : categoryFilter.filter(c => c !== category);
                                  setCategoryFilter(newFilter);
                                setCurrentPage(1);
                                setSelectedRequestIds(new Set());
                                setSelectAll(false);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="truncate">{category}</span>
                            {count > 0 && (
                              <span className="text-gray-500 ml-auto">({count})</span>
                            )}
                          </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('urgency')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle urgency filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.urgency ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleSort('Urgency')}
                        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                      >
                        <span>Urgency</span>
                        {getSortIcon('Urgency')}
                      </button>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </div>
                    {showFilters.urgency && (
                      <div className="w-full text-xs border border-gray-300 rounded p-2 bg-white">
                        {getUniqueUrgencies().map(urgency => (
                          <label key={urgency} className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={urgencyFilter.includes(urgency)}
                              onChange={(e) => {
                                preserveScrollPosition();
                                const newFilter = e.target.checked
                                  ? [...urgencyFilter, urgency]
                                  : urgencyFilter.filter(u => u !== urgency);
                                setUrgencyFilter(newFilter);
                                setCurrentPage(1);
                                setSelectedRequestIds(new Set());
                                setSelectAll(false);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <span>{formatUrgencyDisplay(urgency)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map((request, paginatedIndex) => {
                const filteredIndex = startIndex + paginatedIndex;
                // Find the actual index in the original requests array
                const actualIndex = requests.findIndex(r => 
                  r.Date === request.Date && 
                  r.Time === request.Time && 
                  r.Request_Summary === request.Request_Summary
                );
                const isNonBillable = request.Category === 'Non-billable' || request.Category === 'Migration';
                return (
                  <TableRow 
                    key={filteredIndex} 
                    className={`cursor-pointer transition-colors ${
                      isNonBillable ? 'opacity-50 bg-gray-50' : ''
                    } ${
                      selectedRequestIds.has(actualIndex) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                    }`}
                    onClick={(e) => handleRowClick(actualIndex, e)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRequestIds.has(actualIndex)}
                        onChange={(e) => handleSelectRequest(actualIndex, e as any)}
                        className="rounded border-gray-300 focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell className={isNonBillable ? 'text-gray-400' : ''}>{request.Date}</TableCell>
                    <TableCell className={`text-sm ${isNonBillable ? 'text-gray-400' : 'text-gray-600'}`}>{getDayOfWeek(request.Date)}</TableCell>
                    <TableCell className={isNonBillable ? 'text-gray-400' : ''}>{formatTime(request.Time)}</TableCell>
                    <TableCell className="min-w-[300px] max-w-2xl">
                      <div className={`whitespace-pre-wrap break-words ${isNonBillable ? 'text-gray-400' : ''}`}>
                        {request.Request_Summary}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <EditableCell
                        key={`category-${filteredIndex}-${isNonBillable}`}
                        value={request.Category || categorizeRequest(request.Request_Summary)}
                        options={categoryOptions}
                        onSave={(newValue) => {
                          console.log('Category EditableCell onSave called with:', newValue);
                          if (actualIndex !== -1) {
                            updateRequest(actualIndex, 'Category', newValue);
                          } else {
                            console.error('Could not find request in original array');
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      {isNonBillable ? (
                        <span className="px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded-full">
                          N/A
                        </span>
                      ) : (
                        <EditableCell
                          key={`urgency-${filteredIndex}-${isNonBillable}`}
                          value={request.Urgency}
                          options={urgencyOptions}
                          onSave={(newValue) => {
                            console.log('Urgency EditableCell onSave called with:', newValue);
                            if (actualIndex !== -1) {
                              updateRequest(actualIndex, 'Urgency', newValue);
                            } else {
                              console.error('Could not find request in original array');
                            }
                          }}
                          formatDisplayValue={formatUrgencyDisplay}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(actualIndex);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredAndSortedRequests.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      {/* Archived Requests Section */}
      {apiAvailable && archivedRequests.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowArchived(!showArchived)}
            >
              <div className="flex items-center space-x-2">
                <ChevronRight className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-90' : ''}`} />
                <Archive className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-700">
                  Archived Requests ({archivedRequests.length})
                </h3>
              </div>
              <span className="text-sm text-gray-500">
                Click to {showArchived ? 'hide' : 'show'}
              </span>
            </div>

            {showArchived && (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedRequests.map((request) => {
                      const originalIndex = requests.findIndex(r => r === request);
                      return (
                        <TableRow key={originalIndex} className="opacity-60">
                          <TableCell className="text-sm">
                            {new Date(request.Date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">{request.Time}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {request.Category || 'Support'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="text-sm text-gray-700 whitespace-normal break-words">
                              {request.Request_Summary}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.Urgency === 'HIGH'
                                ? 'bg-red-100 text-red-800'
                                : request.Urgency === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {request.Urgency}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleRestoreRequest(request.id, originalIndex)}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-all duration-200"
                              title="Restore request"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title="Archive Request"
        message={apiAvailable
          ? `Are you sure you want to archive this request?

The request will be moved to the archived section and can be restored at any time.`
          : `Are you sure you want to delete this request?

⚠️ WARNING: This action is PERMANENT and cannot be undone in CSV mode.

The request will be completely removed and cannot be recovered.`}
        confirmText={apiAvailable ? "Archive Request" : "Delete Permanently"}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDestructive={!apiAvailable}
      />
      </div>
    </div>
  );
}
