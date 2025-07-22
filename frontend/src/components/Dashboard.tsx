import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RequestBarChart } from './RequestBarChart';
import { CategoryPieChart } from './CategoryPieChart';
import { Pagination } from './Pagination';
import { EditableCell } from './EditableCell';
import type { ChatRequest } from '../types/request';
import { processDailyRequests, processCategoryData, calculateCosts, categorizeRequest, loadRequestData } from '../utils/dataProcessing';
import { formatTime } from '../utils/timeUtils';
import { saveRequestChanges, saveToDataDirectory } from '../utils/csvExport';
import { DollarSign, Clock, AlertCircle, Download, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Info, ChevronRight, ChevronDown as ChevronDownIcon } from 'lucide-react';

export function Dashboard() {
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorkingVersion, setIsWorkingVersion] = useState(false);
  
  // Deleted requests functionality removed
  
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  
  // Edit state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Date filtering state
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');
  
  // Time view mode for the chart
  const [timeViewMode, setTimeViewMode] = useState<'all' | 'month' | 'day'>('month');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');

  // Bulk selection state
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Row expansion state for request summaries
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Scroll position preservation
  const scrollPositionRef = useRef<number>(0);
  const shouldPreserveScrollRef = useRef<boolean>(false);

  // Dropdown options
  const urgencyOptions = ['Low', 'Medium', 'High'];
  const categoryOptions = ['Advisory', 'Email', 'Forms', 'General', 'Hosting', 'Migration', 'Non-billable', 'Support'];
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper function to get day of week
  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
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
    try {
      // Check if working version exists by trying to fetch it first
      let workingVersionExists = false;
      try {
        const workingResponse = await fetch('/thad_requests_working.csv');
        if (workingResponse.ok) {
          workingVersionExists = true;
        }
      } catch (error) {
        // Working version doesn't exist
      }
      
      // Load data using the updated utility function
      const data = await loadRequestData();
      
      // Set version flag based on what we found
      setIsWorkingVersion(workingVersionExists);
      
      // Convert to ChatRequest format for compatibility
      const requestData: ChatRequest[] = data.map(item => ({
        Date: item.date,
        Time: item.time,
        Request_Summary: item.description,
        Category: item.category,
        Urgency: item.urgency, // This is now guaranteed to be uppercase
        EstimatedHours: item.effort === 'Small' ? 0.25 : item.effort === 'Large' ? 1.0 : 0.5
      }));
      
      // Save original data as backup (only if not already saved and not working version)
      if (!localStorage.getItem('originalRequestsBackup') && !workingVersionExists) {
        localStorage.setItem('originalRequestsBackup', JSON.stringify(requestData));
      }
      
      setRequests(requestData);
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


  // Filter and sort requests by selected year, month, day, and column filters
  const filteredAndSortedRequests = (() => {
    // First filter by year, month, day, and column filters
    const filtered = requests.filter(request => {
      const requestDate = new Date(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1; // JavaScript months are 0-indexed
      const requestDayOfWeek = getDayOfWeek(request.Date);
      
      // Date/time filters
      if (requestYear !== selectedYear) return false;
      if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
      if (selectedDay !== 'all' && request.Date !== selectedDay) return false;
      
      // Column filters
      if (categoryFilter !== 'all' && request.Category !== categoryFilter) return false;
      if (urgencyFilter !== 'all' && request.Urgency !== urgencyFilter.toUpperCase()) return false;
      if (dateFilter !== 'all' && request.Date !== dateFilter) return false;
      if (dayFilter !== 'all' && requestDayOfWeek !== dayFilter) return false;
      
      return true;
    });

    // Then sort
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
          aValue = a.Time;
          bValue = b.Time;
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
          // Sort by urgency level: High > Medium > Low
          const urgencyOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          aValue = urgencyOrder[a.Urgency as keyof typeof urgencyOrder] || 0;
          bValue = urgencyOrder[b.Urgency as keyof typeof urgencyOrder] || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
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

    return hourlyData.filter(hour => hour.count > 0); // Only show hours with data
  };


  // Choose chart data based on time view mode
  const getChartData = () => {
    try {
      if (timeViewMode === 'day' && selectedDay !== 'all') {
        return processHourlyRequests(requests, selectedDay);
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
    setExpandedRows(new Set()); // Clear expanded rows when changing page
  };

  const handlePageSizeChange = (size: number | 'all') => {
    if (size === 'all') {
      setPageSize(requests.length);
    } else {
      setPageSize(size);
    }
    setCurrentPage(1); // Reset to first page when changing page size
    setSelectedRequestIds(new Set()); // Clear selections when changing page size
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when changing page size
    setExpandedRows(new Set()); // Clear expanded rows when changing page size
  };

  const updateRequest = (index: number, field: keyof ChatRequest, value: string) => {
    preserveScrollPosition();
    const newRequests = [...requests];
    // Convert display values back to stored values for Urgency
    let actualValue = value;
    if (field === 'Urgency') {
      actualValue = value.toUpperCase();
    }
    
    newRequests[index] = { ...newRequests[index], [field]: actualValue };
    setRequests(newRequests);
    setHasUnsavedChanges(true);
    
    console.log(`Updated request ${index}: ${field} = ${actualValue}`);
  };

  const handleSaveChanges = async () => {
    const billableRequestsForSave = requests.filter(request => request.Category !== 'Non-billable' && request.Category !== 'Migration');
    const nonBillableRequestsForSave = requests.filter(request => request.Category === 'Non-billable' || request.Category === 'Migration');
    
    try {
      // Save using the new versioning system
      await saveToDataDirectory(billableRequestsForSave, nonBillableRequestsForSave);
      console.log('Successfully created/updated working version');
      
      setHasUnsavedChanges(false);
      setIsWorkingVersion(true); // We now have a working version
    } catch (error) {
      console.warn('Could not save working version, using fallback:', error);
      // Fallback to the original download method
      saveRequestChanges(billableRequestsForSave, nonBillableRequestsForSave);
      
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

  const handleBulkCategoryChange = (newCategory: string) => {
    if (selectedRequestIds.size === 0) return;
    
    preserveScrollPosition();
    const newRequests = [...requests];
    selectedRequestIds.forEach(index => {
      newRequests[index] = { ...newRequests[index], Category: newCategory };
    });
    
    setRequests(newRequests);
    setHasUnsavedChanges(true);
    // Keep selections active for additional bulk operations
    
    console.log(`Updated ${selectedRequestIds.size} requests to category: ${newCategory}`);
  };

  const handleBulkUrgencyChange = (newUrgency: string) => {
    if (selectedRequestIds.size === 0) return;
    
    preserveScrollPosition();
    const newRequests = [...requests];
    const actualUrgency = newUrgency.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
    selectedRequestIds.forEach(index => {
      newRequests[index] = { ...newRequests[index], Urgency: actualUrgency };
    });
    
    setRequests(newRequests);
    setHasUnsavedChanges(true);
    // Keep selections active for additional bulk operations
    
    console.log(`Updated urgency for ${selectedRequestIds.size} selected requests`);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setCurrentPage(1); // Reset pagination when filter changes
    setSelectedRequestIds(new Set()); // Clear selections when filter changes
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when filter changes
    setExpandedRows(new Set()); // Clear expanded rows when filter changes
    
    // Reset month to 'all' when changing years to avoid invalid month selections
    setSelectedMonth('all');
    
    // Reset column filters
    setCategoryFilter('all');
    setUrgencyFilter('all');
    setDateFilter('all');
    setDayFilter('all');
  };

  const handleMonthChange = (month: number | 'all') => {
    setSelectedMonth(month);
    setCurrentPage(1); // Reset pagination when filter changes
    setSelectedRequestIds(new Set()); // Clear selections when filter changes
    setSelectAll(false);
    setLastSelectedIndex(null); // Clear selection anchor when filter changes
    setExpandedRows(new Set()); // Clear expanded rows when filter changes
    setSelectedDay('all'); // Reset day filter when changing month
    
    // Reset some column filters (keep category and urgency as they span across months)
    setDateFilter('all');
    setDayFilter('all');
    
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
    setExpandedRows(new Set()); // Clear expanded rows when filter changes
    
    // Reset some column filters when changing specific day selection
    setDateFilter('all');
    setDayFilter('all');
    
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
    setExpandedRows(new Set()); // Clear expanded rows when resetting filters
    // Reset column filters
    setCategoryFilter('all');
    setUrgencyFilter('all');
    setDateFilter('all');
    setDayFilter('all');
  };

  const formatUrgencyDisplay = (urgency: string) => {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase();
  };

  // Toggle row expansion for request summaries
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Helper function to preserve scroll position during state changes
  const preserveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
    shouldPreserveScrollRef.current = true;
  };

  // Get unique values for column filters
  const getUniqueCategories = () => {
    const categories = Array.from(new Set(
      requests
        .filter(request => {
          const requestDate = new Date(request.Date);
          const requestYear = requestDate.getFullYear();
          const requestMonth = requestDate.getMonth() + 1;
          if (requestYear !== selectedYear) return false;
          if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
          if (selectedDay !== 'all' && request.Date !== selectedDay) return false;
          return true;
        })
        .map(request => request.Category || 'Support')
        .filter(Boolean)
    )).sort();
    return categories;
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
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Request Analysis Dashboard</h1>
            <p className="text-muted-foreground">
              Analysis of support requests from Thad Norman ({billableFilteredRequests.length} billable filtered, {billableRequests.length} total billable, {requests.length} total requests)
              {nonBillableRequests.length > 0 && (
                <span className="text-gray-600"> • {nonBillableRequests.length} non-billable/migration</span>
              )}
            </p>
            {isWorkingVersion && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  <Info className="w-3 h-3" />
                  <span>Using Working Version</span>
                </div>
                <span className="text-xs text-gray-500">
                  Your changes are preserved • Original data protected
                </span>
              </div>
            )}
          </div>
          
          {/* Compact Filter Controls */}
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
              <div className="inline-flex rounded-md shadow-sm" role="group">
                {[
                  { mode: 'all' as const, label: 'All', icon: '📊' },
                  { mode: 'month' as const, label: 'Month', icon: '📅' },
                  { mode: 'day' as const, label: 'Day', icon: '🕐' }
                ].map((item, index, array) => (
                  <button
                    key={item.mode}
                    onClick={() => handleTimeViewModeChange(item.mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      timeViewMode === item.mode
                        ? 'bg-blue-600 text-white shadow-md'
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
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
            <div className="text-2xl font-bold">
              ${filteredCosts?.totalCost.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on urgency tiers
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
              ? `Requests Over Time - ${monthNames[selectedMonth - 1]} ${selectedYear}`
              : 'Requests Over Time'
            }
          </CardTitle>
          <CardDescription>
            {timeViewMode === 'day' && selectedDay !== 'all' 
              ? 'Hourly request distribution by priority level'
              : 'Daily request counts by priority level'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestBarChart 
            data={chartData} 
            isHourlyView={timeViewMode === 'day' && selectedDay !== 'all'} 
          />
        </CardContent>
      </Card>

      {/* Charts and Cost Breakdown Side by Side */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Request Categories</CardTitle>
            <CardDescription>Distribution of request types</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={filteredCategoryData} />
          </CardContent>
        </Card>

        {filteredCosts && (
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Cost Calculation</CardTitle>
              <CardDescription>Based on 0.5 hour increments and urgency-based pricing</CardDescription>
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
              <div className="px-6 py-4 -mx-6 -mb-6 mt-8 border-t bg-gray-50">
                <div className="flex justify-between items-center w-full">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-lg font-semibold">{(filteredCosts.regularHours + filteredCosts.sameDayHours + filteredCosts.emergencyHours).toFixed(1)} hours</p>
                  <p className="text-lg font-semibold">${filteredCosts.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Request Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Billable Requests</CardTitle>
              <CardDescription>Complete list of support requests - click category or urgency to edit</CardDescription>
            </div>
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            )}
          </div>
          
          {/* Table Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-4">
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
                      onChange={(e) => handleBulkCategoryChange(e.target.value)}
                      defaultValue=""
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[100px]"
                    >
                      <option value="" disabled>Change to...</option>
                      {categoryOptions.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Bulk Urgency Change */}
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-600">Urgency:</span>
                    <select
                      onChange={(e) => handleBulkUrgencyChange(e.target.value)}
                      defaultValue=""
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[90px]"
                    >
                      <option value="" disabled>Change to...</option>
                      {urgencyOptions.map(urgency => (
                        <option key={urgency} value={urgency}>{urgency}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Clear Selection Button */}
                  <button
                    onClick={() => {
                      setSelectedRequestIds(new Set());
                      setSelectAll(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
              {(sortColumn !== null || categoryFilter !== 'all' || urgencyFilter !== 'all' || dateFilter !== 'all' || dayFilter !== 'all') && (
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
        </CardHeader>
        <CardContent className="overflow-visible">
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
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSort('Date')}
                      className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                    >
                      <span>Date</span>
                      {getSortIcon('Date')}
                    </button>
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
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSort('DayOfWeek')}
                      className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                    >
                      <span>Day</span>
                      {getSortIcon('DayOfWeek')}
                    </button>
                    <select
                      value={dayFilter}
                      onChange={(e) => {
                        preserveScrollPosition();
                        setDayFilter(e.target.value);
                        setCurrentPage(1);
                        setSelectedRequestIds(new Set());
                        setSelectAll(false);
                      }}
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                    >
                      <option value="all">All Days</option>
                      {getUniqueDays().map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
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
                      title="Click chevron icons to expand/collapse full request text"
                    >
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                      <Info className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
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
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        preserveScrollPosition();
                        setCategoryFilter(e.target.value);
                        setCurrentPage(1);
                        setSelectedRequestIds(new Set());
                        setSelectAll(false);
                      }}
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                    >
                      <option value="all">All Categories</option>
                      {getUniqueCategories().map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
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
                    <select
                      value={urgencyFilter}
                      onChange={(e) => {
                        preserveScrollPosition();
                        setUrgencyFilter(e.target.value);
                        setCurrentPage(1);
                        setSelectedRequestIds(new Set());
                        setSelectAll(false);
                      }}
                      className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                    >
                      <option value="all">All Urgencies</option>
                      {getUniqueUrgencies().map(urgency => (
                        <option key={urgency} value={urgency}>{formatUrgencyDisplay(urgency)}</option>
                      ))}
                    </select>
                  </div>
                </TableHead>
                {/* Actions column removed */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map((request, paginatedIndex) => {
                const actualIndex = startIndex + paginatedIndex;
                const isNonBillable = request.Category === 'Non-billable';
                return (
                  <TableRow 
                    key={actualIndex} 
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
                        onChange={(e) => handleSelectRequest(actualIndex, e.nativeEvent)}
                        className="rounded border-gray-300 focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell className={isNonBillable ? 'text-gray-400' : ''}>{request.Date}</TableCell>
                    <TableCell className={`text-sm ${isNonBillable ? 'text-gray-400' : 'text-gray-600'}`}>{getDayOfWeek(request.Date)}</TableCell>
                    <TableCell className={isNonBillable ? 'text-gray-400' : ''}>{formatTime(request.Time)}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="flex items-start space-x-2">
                        <button
                          onClick={() => toggleRowExpansion(actualIndex)}
                          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors mt-0.5"
                          title={expandedRows.has(actualIndex) ? "Collapse summary" : "Expand summary"}
                        >
                          {expandedRows.has(actualIndex) ? (
                            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <div className={`${expandedRows.has(actualIndex) ? '' : 'truncate'} ${isNonBillable ? 'text-gray-400' : ''}`}>
                          {request.Request_Summary}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <EditableCell
                        key={`category-${actualIndex}-${isNonBillable}-${request.Category}`}
                        value={request.Category || categorizeRequest(request.Request_Summary)}
                        options={categoryOptions}
                        onSave={(newValue) => {
                          updateRequest(actualIndex, 'Category', newValue);
                          // Force re-render by updating the key
                          setHasUnsavedChanges(prev => !prev && true);
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
                          key={`urgency-${actualIndex}-${isNonBillable}`}
                          value={request.Urgency}
                          options={urgencyOptions}
                          onSave={(newValue) => updateRequest(actualIndex, 'Urgency', newValue)}
                          formatDisplayValue={formatUrgencyDisplay}
                        />
                      )}
                    </TableCell>
                    {/* Actions column removed */}
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

      {/* Deleted requests section removed - now using Non-billable category system */}
    </div>
  );
}
