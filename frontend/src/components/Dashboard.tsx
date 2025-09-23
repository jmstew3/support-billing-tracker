import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Scorecard } from './ui/Scorecard';
import { ThemeToggle } from './ui/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RequestCalendarHeatmap } from './RequestCalendarHeatmap';
import CategoryRadarChart from './CategoryRadarChart';
import { CategoryPieChart } from './CategoryPieChart';
import { Pagination } from './Pagination';
import { EditableCell } from './EditableCell';
import { EditableNumberCell } from './EditableNumberCell';
import { ConfirmDialog } from './ConfirmDialog';
import { DatePickerPopover } from './DatePickerPopover';
import type { ChatRequest } from '../types/request';
import { processDailyRequests, processCategoryData, calculateCosts, categorizeRequest } from '../utils/dataProcessing';
import { formatTime } from '../utils/timeUtils';
import { fetchRequests, updateRequest as updateRequestAPI, bulkUpdateRequests, checkAPIHealth, deleteRequest, getTwentySyncStatus, triggerTwentySync, type TwentySyncResponse } from '../utils/api';
import { DollarSign, Clock, AlertCircle, Download, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Info, Filter, Search, X, Trash2, RotateCcw, Archive, Calendar, TrendingUp, BarChart3, Tag, Eye, EyeOff, MessageCircle, Ticket, Mail, Phone } from 'lucide-react';
import { PRICING_CONFIG } from '../config/pricing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, LineChart } from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


// Safe date parsing function that avoids timezone conversion issues
// Parses YYYY-MM-DD strings in local timezone (EDT) without UTC conversion
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
}

// Format currency with exactly 2 decimal places
function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);
  
  
  // Deleted requests functionality removed
  
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  
  // Date filtering state
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');
  
  // Time view mode for the chart
  const [timeViewMode, setTimeViewMode] = useState<'all' | 'month' | 'day'>('all');
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column filter state - changed to arrays for multiple selections
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all'); // Keep as dropdown
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState<{
    date: boolean;
    day: boolean;
    category: boolean;
    urgency: boolean;
    source: boolean;
  }>({
    date: false,
    day: false,
    category: false,
    urgency: false,
    source: false
  });

  // Bulk selection state
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Staged bulk changes
  const [stagedBulkCategory, setStagedBulkCategory] = useState<string>('');
  const [stagedBulkUrgency, setStagedBulkUrgency] = useState<string>('');
  const [stagedBulkHours, setStagedBulkHours] = useState<number | null>(null);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Chart type toggle
  const [chartType, setChartType] = useState<'pie' | 'radar'>('radar');
  const [costViewType, setCostViewType] = useState<'table' | 'chart'>('table');
  const [visibleUrgencies, setVisibleUrgencies] = useState<Record<string, boolean>>({
    Promotion: true,
    Low: true,
    Medium: true,
    High: true
  });

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

  // Twenty sync status
  const [syncStatus, setSyncStatus] = useState<TwentySyncResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Row expansion removed - request summaries now always wrap

  // Scroll position preservation
  const scrollPositionRef = useRef<number>(0);
  const shouldPreserveScrollRef = useRef<boolean>(false);

  // Dropdown options
  const urgencyOptions = ['Low', 'Medium', 'High', 'Promotion'];
  const categoryOptions = ['Advisory', 'Email', 'Forms', 'General', 'Hosting', 'Migration', 'Non-billable', 'Support'];
  
  // Toggle individual column filter visibility
  const toggleColumnFilter = (column: 'date' | 'day' | 'category' | 'urgency' | 'source') => {
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

  // Activity Metric Helper Functions
  const getMostActiveDay = (requests: ChatRequest[]) => {
    if (requests.length === 0) return { dates: [], count: 0, displayText: 'N/A', subtitle: '' };

    const dayCount: Record<string, number> = {};
    requests.forEach(request => {
      dayCount[request.Date] = (dayCount[request.Date] || 0) + 1;
    });

    // Find maximum count
    let maxCount = 0;
    Object.values(dayCount).forEach(count => {
      if (count > maxCount) maxCount = count;
    });

    // Find ALL dates with maximum count
    const topDates: string[] = [];
    Object.entries(dayCount).forEach(([date, count]) => {
      if (count === maxCount) {
        topDates.push(date);
      }
    });

    // Sort dates chronologically
    topDates.sort();

    // Format display text based on number of ties
    let displayText = 'N/A';
    let subtitle = '';

    if (topDates.length === 1) {
      // Single date - format as before
      const [year, month, day] = topDates[0].split('-').map(Number);
      const date = new Date(year, month - 1, day);
      displayText = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } else if (topDates.length === 2) {
      // Two dates - show both
      const formatted = topDates.map(d => {
        const [year, month, day] = d.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      });
      displayText = formatted.join(' & ');
    } else if (topDates.length > 2) {
      // Multiple dates - show count
      displayText = `${topDates.length} days tied`;
      // Format first few for subtitle
      const formatted = topDates.slice(0, 3).map(d => {
        const [year, month, day] = d.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      });
      subtitle = formatted.join(', ') + (topDates.length > 3 ? '...' : '');
    }

    return {
      dates: topDates,
      count: maxCount,
      displayText,
      subtitle
    };
  };

  const getMostActiveTimeRange = (requests: ChatRequest[]) => {
    if (requests.length === 0) return { range: 'N/A', count: 0 };

    const ranges = {
      'Morning (8AM-12PM)': 0,
      'Afternoon (12PM-4PM)': 0,
      'Evening (4PM-6PM)': 0,
      'Night (6PM-10PM)': 0,
      'Late Night (10PM-8AM)': 0
    };

    requests.forEach(request => {
      const minutes = parseTimeToMinutes(request.Time);
      const hours = Math.floor(minutes / 60);

      if (hours >= 8 && hours < 12) {
        ranges['Morning (8AM-12PM)']++;
      } else if (hours >= 12 && hours < 16) {
        ranges['Afternoon (12PM-4PM)']++;
      } else if (hours >= 16 && hours < 18) {
        ranges['Evening (4PM-6PM)']++;
      } else if (hours >= 18 && hours < 22) {
        ranges['Night (6PM-10PM)']++;
      } else {
        ranges['Late Night (10PM-8AM)']++;
      }
    });

    let maxRange = '';
    let maxCount = 0;
    Object.entries(ranges).forEach(([range, count]) => {
      if (count > maxCount) {
        maxRange = range;
        maxCount = count;
      }
    });

    return { range: maxRange || 'N/A', count: maxCount };
  };

  const getBusiestDayOfWeek = (requests: ChatRequest[]) => {
    if (requests.length === 0) return { day: 'N/A', count: 0 };

    const dayCount: Record<string, number> = {};
  
    requests.forEach(request => {
      const dayName = getDayOfWeek(request.Date);
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });

    let maxDay = '';
    let maxCount = 0;
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > maxCount) {
        maxDay = day;
        maxCount = count;
      }
    });

    return { day: maxDay || 'N/A', count: maxCount };
  };

  const getTopCategory = (requests: ChatRequest[]) => {
    if (requests.length === 0) return { category: 'N/A', count: 0, percentage: 0 };

    const categoryCount: Record<string, number> = {};
    requests.forEach(request => {
      const category = request.Category || 'Support';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    let maxCategory = '';
    let maxCount = 0;
    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCategory = category;
        maxCount = count;
      }
    });

    const percentage = requests.length > 0 ? Math.round((maxCount / requests.length) * 100) : 0;

    return { category: maxCategory || 'N/A', count: maxCount, percentage };
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
  // IMPORTANT: Only include 'active' status requests in calculations
  const billableRequests = requests.filter(request =>
    request.Status === 'active' &&
    request.Category !== 'Non-billable'
  );
  const nonBillableRequests = requests.filter(request =>
    request.Status === 'active' &&
    request.Category === 'Non-billable'
  );

  // Get archived requests - sorted chronologically
  const archivedRequests = requests
    .filter(request => request.Status === 'deleted')
    .sort((a, b) => {
      // Sort by date first
      const dateA = parseLocalDate(a.Date);
      const dateB = parseLocalDate(b.Date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;

      // If dates are equal, sort by time
      const timeA = parseTimeToMinutes(a.Time);
      const timeB = parseTimeToMinutes(b.Time);
      return timeA - timeB;
    });

  // Calculate available years and months from all data (billable and non-billable)
  const availableYears = Array.from(new Set(
    requests.map(request => parseLocalDate(request.Date).getFullYear())
  )).sort((a, b) => b - a); // Sort descending (newest first)

  const availableMonthsForYear = Array.from(new Set(
    requests
      .filter(request => parseLocalDate(request.Date).getFullYear() === selectedYear)
      .map(request => parseLocalDate(request.Date).getMonth() + 1)
  )).sort((a, b) => a - b); // Sort ascending (Jan to Dec)

  // Get available dates from filtered requests (by year/month)
  const availableDates = Array.from(new Set(
    requests
      .filter(request => {
        const requestDate = parseLocalDate(request.Date);
        const requestYear = requestDate.getFullYear();
        const requestMonth = requestDate.getMonth() + 1;
        
        if (requestYear !== selectedYear) return false;
        if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
        
        return true;
      })
      .map(request => request.Date)
  )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // Sort chronologically (oldest first)

  useEffect(() => {
    // Load data and sync status
    loadData();
    loadSyncStatus();
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
      // Check if API is available
      const apiHealthy = await checkAPIHealth();
      console.log('API health check result:', apiHealthy);
      console.log('API URL being used:', import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

      if (apiHealthy) {
        // Use API to load data
        console.log('Loading data from API...');
        setApiAvailable(true);

        // Fetch all requests regardless of status
        const apiRequests = await fetchRequests({ status: 'all' });
        console.log('Received from API:', { count: apiRequests.length, sample: apiRequests[0] });

        // Default existing data to 'sms' source if not specified
        const requestsWithSource = apiRequests.map(req => ({
          ...req,
          source: req.source || 'sms'
        }));

        // Tickets are now fetched from database alongside SMS requests
        console.log(`Total requests: ${requestsWithSource.length} (includes both SMS and tickets from database)`);

        // Keep ALL requests (including deleted) for archive functionality
        setRequests(requestsWithSource);
      } else {
        throw new Error('API is not available');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setApiAvailable(false);
      // Use sample data for development
      const sampleData: ChatRequest[] = [
        {
          Date: '2025-05-15',
          Time: '07:14 AM',
          Request_Summary: 'Sample request - API connection failed',
          Urgency: 'HIGH',
          Category: 'Support',
          EstimatedHours: 0.5
        }
      ];
      setRequests(sampleData);
      setLoading(false);
    }
  };

  // Load Twenty sync status
  const loadSyncStatus = async () => {
    try {
      const status = await getTwentySyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  // Handle Twenty sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await triggerTwentySync();
      console.log('Sync completed:', result);

      // Reload sync status and data after successful sync
      await loadSyncStatus();
      await loadData();

      // Show success message (you could add a toast notification here)
      console.log(`✅ Sync successful: ${result.ticketsAdded} added, ${result.ticketsUpdated} updated`);
    } catch (error) {
      console.error('Sync failed:', error);
      // Show error message (you could add a toast notification here)
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter and sort requests by selected year, month, day, column filters, and search query
  const filteredAndSortedRequests = (() => {
    // First filter by year, month, day, column filters, and search query
    const filtered = requests.filter(request => {
      // Exclude deleted items from main table (only show active items)
      if (request.Status === 'deleted') return false;

      const requestDate = parseLocalDate(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1; // JavaScript months are 0-indexed
      const requestDayOfWeek = getDayOfWeek(request.Date);

      // Apply non-billable filter if toggle is on
      if (hideNonBillable) {
        const isNonBillable = request.Category === 'Non-billable';
        if (isNonBillable) return false;
      }

      // Date/time filters
      if (requestYear !== selectedYear) return false;
      if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
      if (selectedDay !== 'all' && request.Date !== selectedDay) return false;

      // Column filters - updated for checkbox arrays
      if (categoryFilter.length > 0 && !categoryFilter.includes(request.Category || 'Support')) return false;
      if (urgencyFilter.length > 0 && !urgencyFilter.includes(request.Urgency)) return false;
      if (sourceFilter.length > 0 && !sourceFilter.includes(request.source || 'sms')) return false;
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
          aValue = parseLocalDate(a.Date);
          bValue = parseLocalDate(b.Date);
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
      const dateA = parseLocalDate(a.Date);
      const dateB = parseLocalDate(b.Date);
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
    const requestDate = parseLocalDate(request.Date);
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
    const requestDate = parseLocalDate(request.Date);
    const requestYear = requestDate.getFullYear();
    const requestMonth = requestDate.getMonth() + 1;

    if (requestYear !== selectedYear) return false;
    if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
    if (selectedDay !== 'all' && request.Date !== selectedDay) return false;

    return true;
  });
  const allCategoryDataForCharts = processCategoryData(allRequestsForCharts);
  const filteredCosts = calculateCosts(billableFilteredRequests);

  // Calculate monthly costs when viewing all months
  const calculateMonthlyCosts = () => {
    if (selectedMonth !== 'all') return null;

    const monthlyCosts: { month: string; year: number; costs: any }[] = [];

    // Group requests by month
    const requestsByMonth = new Map<string, ChatRequest[]>();

    billableRequests.forEach(request => {
      const requestDate = parseLocalDate(request.Date);
      const year = requestDate.getFullYear();
      const month = requestDate.getMonth() + 1;

      // Only include months from the selected year
      if (year === selectedYear) {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        if (!requestsByMonth.has(key)) {
          requestsByMonth.set(key, []);
        }
        requestsByMonth.get(key)!.push(request);
      }
    });

    // Sort months and calculate costs for each
    Array.from(requestsByMonth.keys())
      .sort()
      .forEach(key => {
        const [year, month] = key.split('-').map(Number);
        const monthRequests = requestsByMonth.get(key)!;
        const costs = calculateCosts(monthRequests);

        monthlyCosts.push({
          month: monthNames[month - 1],
          year,
          costs
        });
      });

    return monthlyCosts;
  };

  const monthlyCosts = calculateMonthlyCosts();

  // Calculate activity metrics based on filtered billable requests
  const mostActiveDay = getMostActiveDay(billableFilteredRequests);
  const mostActiveTimeRange = getMostActiveTimeRange(billableFilteredRequests);
  const busiestDayOfWeek = getBusiestDayOfWeek(billableFilteredRequests);
  const topCategory = getTopCategory(billableFilteredRequests);

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

  const updateRequest = async (index: number, field: keyof ChatRequest, value: string | number) => {
    console.log(`Dashboard updateRequest called: index=${index}, field=${field}, value=${value}`);
    preserveScrollPosition();
    const newRequests = [...requests];
    // Convert display values back to stored values for Urgency
    let actualValue: string | number = value;
    if (field === 'Urgency' && typeof value === 'string') {
      actualValue = value.toUpperCase();
    } else if (field === 'EstimatedHours' && typeof value === 'number') {
      actualValue = value;
    }

    console.log(`Before update - current value: ${newRequests[index][field]}, new value: ${actualValue}`);
    newRequests[index] = { ...newRequests[index], [field]: actualValue as any };
    setRequests(newRequests);

    // Update in database via API
    if (apiAvailable && newRequests[index].id) {
      try {
        // Create the update object with the correct field name
        const updateData: Partial<ChatRequest> = {};
        if (field === 'EstimatedHours') {
          updateData.EstimatedHours = actualValue as number;
        } else if (field === 'Category') {
          updateData.Category = actualValue as string;
        } else if (field === 'Urgency') {
          updateData.Urgency = actualValue as ('HIGH' | 'MEDIUM' | 'LOW' | 'PROMOTION' | undefined);
        } else {
          updateData[field as keyof ChatRequest] = actualValue as any;
        }

        await updateRequestAPI(newRequests[index].id, updateData);
        console.log(`Updated request ${index} in database: ${field} = ${actualValue}`);
      } catch (error) {
        console.error('Failed to update in database:', error);
        // Revert the change on error
        const revertedRequests = [...requests];
        setRequests(revertedRequests);
      }
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
      // Auto-save removed - API only
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
      } else {
        // CSV mode removed - API only
        console.log('Save functionality removed - using API only');
      }
    } catch (error) {
      console.warn('Save failed:', error);
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
      // Select all visible requests using their actual indices from the original array
      const allIds = new Set<number>();
      paginatedRequests.forEach((request) => {
        const actualIndex = requests.findIndex(
          r => r.Date === request.Date &&
              r.Time === request.Time &&
              r.Request_Summary === request.Request_Summary
        );
        if (actualIndex !== -1) {
          allIds.add(actualIndex);
        }
      });
      setSelectedRequestIds(allIds);
      setSelectAll(true);
    }
  };

  // Bulk delete function removed - now using Non-billable category system

  // Apply staged bulk changes
  const applyBulkChanges = async () => {
    if (selectedRequestIds.size === 0) return;
    if (!stagedBulkCategory && !stagedBulkUrgency && stagedBulkHours === null) return;

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

      if (stagedBulkHours !== null) {
        updatedRequest.EstimatedHours = stagedBulkHours;
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
    if (stagedBulkHours !== null) updatePayload.EstimatedHours = stagedBulkHours;

    // If API is available, update in database
    if (apiAvailable && idsToUpdate.length > 0 && Object.keys(updatePayload).length > 0) {
      try {
        await bulkUpdateRequests(idsToUpdate, updatePayload);
        console.log(`Updated ${idsToUpdate.length} requests in database`);
      } catch (error) {
        console.error('Failed to bulk update in database:', error);
      }
    } else {
      // CSV mode or no IDs - mark as having unsaved changes
      console.log(`Updated ${selectedRequestIds.size} requests locally`);
      // Auto-save removed - API only
    }

    // Clear selections and staged changes after applying
    setSelectedRequestIds(new Set());
    setSelectAll(false);
    setStagedBulkCategory('');
    setStagedBulkUrgency('');
    setStagedBulkHours(null);
  };

  // Clear staged changes
  const clearStagedChanges = () => {
    setStagedBulkCategory('');
    setStagedBulkUrgency('');
    setStagedBulkHours(null);
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

  // Navigation functions for month arrows
  const handlePreviousMonth = () => {
    let newMonth: number;
    let newYear: number = selectedYear;

    if (selectedMonth === 'all') {
      // If currently viewing all months, go to the most recent month
      if (availableMonthsForYear.length > 0) {
        newMonth = availableMonthsForYear[availableMonthsForYear.length - 1];
      } else {
        return; // No months available
      }
    } else {
      newMonth = selectedMonth - 1;

      // If we go before January, go to December of previous year
      if (newMonth < 1) {
        newMonth = 12;
        newYear = selectedYear - 1;

        // Check if previous year exists in available years
        if (!availableYears.includes(newYear)) {
          return; // Can't go to previous year
        }
      }
    }

    // Check if the target month has data
    const targetMonthHasData = requests.some(request => {
      const requestDate = parseLocalDate(request.Date);
      return requestDate.getFullYear() === newYear &&
             requestDate.getMonth() + 1 === newMonth;
    });

    if (!targetMonthHasData) {
      // Try to find the nearest previous month with data
      for (let y = newYear; y >= Math.min(...availableYears); y--) {
        for (let m = (y === newYear ? newMonth : 12); m >= 1; m--) {
          const hasData = requests.some(request => {
            const requestDate = parseLocalDate(request.Date);
            return requestDate.getFullYear() === y &&
                   requestDate.getMonth() + 1 === m;
          });
          if (hasData) {
            newYear = y;
            newMonth = m;
            break;
          }
        }
        if (newMonth !== (y === newYear ? newMonth : 12)) break;
      }
    }

    // Update the state
    if (newYear !== selectedYear) {
      setSelectedYear(newYear);
    }
    setSelectedMonth(newMonth);
    setSelectedDay('all');
    setTimeViewMode('month');
    setCurrentPage(1);
    setSelectedRequestIds(new Set());
    setSelectAll(false);
  };

  const handleNextMonth = () => {
    let newMonth: number;
    let newYear: number = selectedYear;

    if (selectedMonth === 'all') {
      // If currently viewing all months, go to the first month
      if (availableMonthsForYear.length > 0) {
        newMonth = availableMonthsForYear[0];
      } else {
        return; // No months available
      }
    } else {
      newMonth = selectedMonth + 1;

      // If we go past December, go to January of next year
      if (newMonth > 12) {
        newMonth = 1;
        newYear = selectedYear + 1;

        // Check if next year exists in available years
        if (!availableYears.includes(newYear)) {
          return; // Can't go to next year
        }
      }
    }

    // Check if the target month has data
    const targetMonthHasData = requests.some(request => {
      const requestDate = parseLocalDate(request.Date);
      return requestDate.getFullYear() === newYear &&
             requestDate.getMonth() + 1 === newMonth;
    });

    if (!targetMonthHasData) {
      // Try to find the nearest next month with data
      for (let y = newYear; y <= Math.max(...availableYears); y++) {
        for (let m = (y === newYear ? newMonth : 1); m <= 12; m++) {
          const hasData = requests.some(request => {
            const requestDate = parseLocalDate(request.Date);
            return requestDate.getFullYear() === y &&
                   requestDate.getMonth() + 1 === m;
          });
          if (hasData) {
            newYear = y;
            newMonth = m;
            break;
          }
        }
        if (newMonth !== (y === newYear ? newMonth : 1)) break;
      }
    }

    // Update the state
    if (newYear !== selectedYear) {
      setSelectedYear(newYear);
    }
    setSelectedMonth(newMonth);
    setSelectedDay('all');
    setTimeViewMode('month');
    setCurrentPage(1);
    setSelectedRequestIds(new Set());
    setSelectAll(false);
  };

  // Check if we can navigate to previous/next month
  const canNavigatePrevious = () => {
    if (requests.length === 0) return false;

    if (selectedMonth === 'all') {
      return availableMonthsForYear.length > 0;
    }

    // Check if there's any data before current month
    return requests.some(request => {
      const requestDate = parseLocalDate(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1;

      return requestYear < selectedYear ||
             (requestYear === selectedYear && requestMonth < selectedMonth);
    });
  };

  const canNavigateNext = () => {
    if (requests.length === 0) return false;

    if (selectedMonth === 'all') {
      return availableMonthsForYear.length > 0;
    }

    // Check if there's any data after current month
    return requests.some(request => {
      const requestDate = parseLocalDate(request.Date);
      const requestYear = requestDate.getFullYear();
      const requestMonth = requestDate.getMonth() + 1;

      return requestYear > selectedYear ||
             (requestYear === selectedYear && requestMonth > selectedMonth);
    });
  };

  // Get tooltip text for navigation buttons
  const getPreviousMonthTooltip = () => {
    if (selectedMonth === 'all') {
      if (availableMonthsForYear.length > 0) {
        const lastMonth = availableMonthsForYear[availableMonthsForYear.length - 1];
        return `Go to ${monthNames[lastMonth - 1]} ${selectedYear}`;
      }
      return 'Previous month';
    }

    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    return `Go to ${monthNames[prevMonth - 1]} ${prevYear}`;
  };

  const getNextMonthTooltip = () => {
    if (selectedMonth === 'all') {
      if (availableMonthsForYear.length > 0) {
        const firstMonth = availableMonthsForYear[0];
        return `Go to ${monthNames[firstMonth - 1]} ${selectedYear}`;
      }
      return 'Next month';
    }

    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    return `Go to ${monthNames[nextMonth - 1]} ${nextYear}`;
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
          const requestDate = parseLocalDate(request.Date);
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
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto py-4">
          <div className="flex items-start justify-between">
            {/* Left side - Title and Database Status */}
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">Request Analysis Dashboard</h1>
              {apiAvailable && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
                  <Info className="w-3 h-3" />
                  <span>Connected to Database</span>
                </div>
              )}
              {/* Twenty Sync Status */}
              {syncStatus?.syncStatus && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs ${
                  syncStatus.syncStatus.last_sync_status === 'success'
                    ? 'bg-blue-100 text-blue-800'
                    : syncStatus.syncStatus.last_sync_status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <Ticket className="w-3 h-3" />
                  <span>
                    {syncStatus.totalTickets} tickets
                    {syncStatus.syncStatus.last_sync_at && (
                      ` (${new Date(syncStatus.syncStatus.last_sync_at).toLocaleDateString()})`
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center space-x-6">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-muted-foreground">Period:</span>

              {/* Navigation arrows and date picker */}
              <div className="flex items-center space-x-1">
                {/* Previous Month Arrow */}
                <button
                  onClick={handlePreviousMonth}
                  disabled={!canNavigatePrevious()}
                  className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
                    !canNavigatePrevious()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  title={canNavigatePrevious() ? getPreviousMonthTooltip() : 'No previous data'}
                  aria-label="Navigate to previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <DatePickerPopover
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  selectedDay={selectedDay}
                  availableYears={availableYears}
                  availableMonths={availableMonthsForYear}
                  availableDates={availableDates}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                  onDayChange={handleDayChange}
                />

                {/* Next Month Arrow */}
                <button
                  onClick={handleNextMonth}
                  disabled={!canNavigateNext()}
                  className={`p-1.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors ${
                    !canNavigateNext()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  title={canNavigateNext() ? getNextMonthTooltip() : 'No future data'}
                  aria-label="Navigate to next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
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
                        : 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                    } ${
                      index === 0 ? 'rounded-l-md' :
                      index === array.length - 1 ? 'rounded-r-md' : ''
                    } border ${
                      index > 0 ? 'border-l-0' : ''
                    } ${
                      timeViewMode === item.mode ? 'border-blue-600' : 'border-border'
                    }`}
                    title={`View by ${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Twenty Sync Button */}
            {apiAvailable && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isSyncing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                <Ticket className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Tickets'}</span>
              </button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto py-8 space-y-6">
        {/* Info section - Not sticky */}
        <div className="space-y-2">
        <p className="text-muted-foreground">
          {hideNonBillable ? (
            <>
              Showing <span className="font-medium">{billableFilteredRequests.length}</span> billable requests
              <span className="text-orange-600 dark:text-orange-400 ml-2">
                ({nonBillableRequests.length} non-billable hidden)
              </span>
            </>
          ) : (
            <>
              Showing <span className="font-medium">{billableFilteredRequests.length + nonBillableRequests.length}</span> total requests
              {nonBillableRequests.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({billableRequests.length} billable, {nonBillableRequests.length} non-billable)
                </span>
              )}
            </>
          )}
        </p>
        <div className="flex items-center space-x-3">
          {false ? (
            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md text-xs">
              <Info className="w-3 h-3" />
              <span>Working Version (CSV)</span>
            </div>
          ) : null}
          {false && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded-md text-xs">
              <Clock className="w-3 h-3" />
              <span>Unsaved changes - click Save button</span>
            </div>
          )}
          {!apiAvailable && (
            <span className="text-xs text-muted-foreground">
              Manual save required • Original data protected
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Scorecard
          title="Total Requests"
          value={billableFilteredRequests.length}
          description={(() => {
            const smsCount = billableFilteredRequests.filter(r => (r.source || 'sms') === 'sms').length;
            const ticketCount = billableFilteredRequests.filter(r => r.source === 'ticket').length;
            const otherCount = billableFilteredRequests.filter(r => r.source && r.source !== 'sms' && r.source !== 'ticket').length;

            const parts = [];
            if (smsCount > 0) parts.push(`${smsCount} Text`);
            if (ticketCount > 0) parts.push(`${ticketCount} Ticket`);
            if (otherCount > 0) parts.push(`${otherCount} Other`);

            return parts.length > 0 ? parts.join(', ') : (
              timeViewMode === 'day' && selectedDay !== 'all'
                ? `Across ${chartData.length} hours`
                : `Across ${chartData.length} days`
            );
          })()}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />

        <Scorecard
          title="Total Hours"
          value={filteredCosts ? (filteredCosts.regularHours + filteredCosts.sameDayHours + filteredCosts.emergencyHours + filteredCosts.promotionalHours).toFixed(2) : 0}
          description="At 0.5 hours per request"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />

        <Scorecard
          title="Total Cost"
          value={`$${formatCurrency(filteredCosts?.totalCost || 0)}`}
          description="Tiered pricing"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />

        <Scorecard
          title="High Priority"
          value={billableFilteredRequests.filter(r => r.Urgency === 'HIGH').length}
          description={`${billableFilteredRequests.length > 0 ? Math.round((billableFilteredRequests.filter(r => r.Urgency === 'HIGH').length / billableFilteredRequests.length) * 100) : 0}% of billable`}
          icon={<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
        />
      </div>

      {/* Activity Insights Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Scorecard
          title="Most Active Day"
          value={
            <div>
              <div className="text-2xl font-bold">
                {mostActiveDay.displayText}
              </div>
              {mostActiveDay.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {mostActiveDay.subtitle}
                </p>
              )}
            </div>
          }
          description={`${mostActiveDay.count} requests${mostActiveDay.dates.length > 1 ? ' each' : ''}`}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          valueClassName="!p-0"
        />

        <Scorecard
          title="Peak Time"
          value={mostActiveTimeRange.range.split(' (')[0]}
          description={`${mostActiveTimeRange.count} requests`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />

        <Scorecard
          title="Busiest Day"
          value={busiestDayOfWeek.day}
          description={`${busiestDayOfWeek.count} requests on average`}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />

        <Scorecard
          title="Top Category"
          value={topCategory.category}
          description={`${topCategory.percentage}% of requests`}
          icon={<Tag className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Requests Over Time - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>
            {timeViewMode === 'day' && selectedDay !== 'all'
              ? (() => {
                  try {
                    return `Requests by Hour - ${parseLocalDate(selectedDay).toLocaleDateString('en-US', {
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
      <div className="grid gap-8 md:grid-cols-5">
        {filteredCosts && (
          <Card className="flex flex-col h-full md:col-span-3">
            <CardHeader>
              <CardTitle>Cost Calculation</CardTitle>
              <CardDescription>
                {selectedMonth === 'all'
                  ? `Monthly breakdown for ${selectedYear}`
                  : 'Cost breakdown by service tier (0.5 hour increments)'}
              </CardDescription>
              <div className="flex gap-1 mt-2">
                <button
                  className={`px-3 py-1 text-xs rounded-l-md transition-colors ${
                    costViewType === 'table'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setCostViewType('table')}
                >
                  Table
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded-r-md transition-colors ${
                    costViewType === 'chart'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setCostViewType('chart')}
                >
                  Chart
                </button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {costViewType === 'table' ? (
                // Table view
                selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0 ? (
                  // Monthly breakdown view - Urgency by Month
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Urgency</th>
                        {monthlyCosts.map((monthData) => (
                          <th key={`${monthData.year}-${monthData.month}`} className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                            {monthData.month.substring(0, 3)}
                          </th>
                        ))}
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Promotion Row */}
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4 font-medium">Promotion</td>
                        {monthlyCosts.map((monthData) => (
                          <td key={`promotion-${monthData.year}-${monthData.month}`} className="py-3 px-4">
                            {monthData.costs.promotionalCost === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(monthData.costs.promotionalCost)}</span>
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 font-semibold">
                          {(() => {
                            const total = monthlyCosts.reduce((sum, m) => sum + m.costs.promotionalCost, 0);
                            return total === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(total)}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                      {/* Low Row */}
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4 font-medium">Low</td>
                        {monthlyCosts.map((monthData) => (
                          <td key={`low-${monthData.year}-${monthData.month}`} className="py-3 px-4">
                            {monthData.costs.regularCost === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(monthData.costs.regularCost)}</span>
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 font-semibold">
                          {(() => {
                            const total = monthlyCosts.reduce((sum, m) => sum + m.costs.regularCost, 0);
                            return total === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(total)}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                      {/* Medium Row */}
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4 font-medium">Medium</td>
                        {monthlyCosts.map((monthData) => (
                          <td key={`medium-${monthData.year}-${monthData.month}`} className="py-3 px-4">
                            {monthData.costs.sameDayCost === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(monthData.costs.sameDayCost)}</span>
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 font-semibold">
                          {(() => {
                            const total = monthlyCosts.reduce((sum, m) => sum + m.costs.sameDayCost, 0);
                            return total === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(total)}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                      {/* High Row */}
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4 font-medium">High</td>
                        {monthlyCosts.map((monthData) => (
                          <td key={`high-${monthData.year}-${monthData.month}`} className="py-3 px-4">
                            {monthData.costs.emergencyCost === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(monthData.costs.emergencyCost)}</span>
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 font-semibold">
                          {(() => {
                            const total = monthlyCosts.reduce((sum, m) => sum + m.costs.emergencyCost, 0);
                            return total === 0 ? (
                              <div className="text-center">-</div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>$</span>
                                <span>{formatCurrency(total)}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                      {/* Total Row */}
                      <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                        <td className="py-3 px-4">Total</td>
                        {monthlyCosts.map((monthData) => (
                          <td key={`total-${monthData.year}-${monthData.month}`} className="py-3 px-4">
                            <div className="flex justify-between items-center">
                              <span>$</span>
                              <span>{formatCurrency(monthData.costs.totalCost)}</span>
                            </div>
                          </td>
                        ))}
                        <td className="py-3 px-4">
                          <div className="flex justify-between items-center">
                            <span>$</span>
                            <span>{formatCurrency(monthlyCosts.reduce((sum, m) => sum + m.costs.totalCost, 0))}</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                // Regular tier breakdown view
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Service Type</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Rate</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">Hours</th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4">Promotion</td>
                        <td className="text-center py-3 px-4">$125/hr</td>
                        <td className="text-center py-3 px-4 font-semibold">
                          {filteredCosts.promotionalHours === 0 ? '-' : filteredCosts.promotionalHours.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {filteredCosts.promotionalCost === 0 ? (
                            <div className="text-center">-</div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span>$</span>
                              <span>{formatCurrency(filteredCosts.promotionalCost)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4">Low</td>
                        <td className="text-center py-3 px-4">${PRICING_CONFIG.tiers[0].rate}/hr</td>
                        <td className="text-center py-3 px-4 font-semibold">
                          {filteredCosts.regularHours === 0 ? '-' : filteredCosts.regularHours.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {filteredCosts.regularCost === 0 ? (
                            <div className="text-center">-</div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span>$</span>
                              <span>{formatCurrency(filteredCosts.regularCost)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4">Medium</td>
                        <td className="text-center py-3 px-4">${PRICING_CONFIG.tiers[1].rate}/hr</td>
                        <td className="text-center py-3 px-4 font-semibold">
                          {filteredCosts.sameDayHours === 0 ? '-' : filteredCosts.sameDayHours.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {filteredCosts.sameDayCost === 0 ? (
                            <div className="text-center">-</div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span>$</span>
                              <span>{formatCurrency(filteredCosts.sameDayCost)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="py-3 px-4">High</td>
                        <td className="text-center py-3 px-4">${PRICING_CONFIG.tiers[2].rate}/hr</td>
                        <td className="text-center py-3 px-4 font-semibold">
                          {filteredCosts.emergencyHours === 0 ? '-' : filteredCosts.emergencyHours.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {filteredCosts.emergencyCost === 0 ? (
                            <div className="text-center">-</div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span>$</span>
                              <span>{formatCurrency(filteredCosts.emergencyCost)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                        <td className="py-3 px-4">Total</td>
                        <td className="text-center py-3 px-4">-</td>
                        <td className="text-center py-3 px-4">{(filteredCosts.regularHours + filteredCosts.sameDayHours + filteredCosts.emergencyHours + filteredCosts.promotionalHours).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-between items-center">
                            <span>$</span>
                            <span>{formatCurrency(filteredCosts.totalCost)}</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                )
              ) : (
                // Chart view
                (() => {
                  // Prepare data for stacked bar chart
                  if (selectedMonth === 'all' && monthlyCosts && monthlyCosts.length > 0) {
                    // Transform data for monthly view
                    const chartData = monthlyCosts.map(month => ({
                      month: month.month.substring(0, 3),
                      Promotion: month.costs.promotionalCost,
                      Low: month.costs.regularCost,
                      Medium: month.costs.sameDayCost,
                      High: month.costs.emergencyCost,
                      totalHours: month.costs.promotionalHours + month.costs.regularHours + month.costs.sameDayHours + month.costs.emergencyHours,
                    }));

                    return (
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={chartData}>
                          <defs>
                            <pattern id="diagonalStripesMonthly" patternUnits="userSpaceOnUse" width="8" height="8">
                              <rect width="8" height="8" fill="#60A5FA" className="dark:fill-slate-300" />
                              <path d="M0,8 L8,0" stroke="#1E40AF" strokeWidth="2" className="dark:stroke-slate-600" />
                              <path d="M-2,2 L2,-2" stroke="#1E40AF" strokeWidth="2" className="dark:stroke-slate-600" />
                              <path d="M6,10 L10,6" stroke="#1E40AF" strokeWidth="2" className="dark:stroke-slate-600" />
                            </pattern>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                          <XAxis
                            dataKey="month"
                            tick={{ fill: '#374151' }}
                            className="dark:[&_text]:fill-gray-300"
                          />
                          <YAxis
                            yAxisId="cost"
                            tickFormatter={(value) => `$${(value).toLocaleString()}`}
                            tick={{ fill: '#374151' }}
                            className="dark:[&_text]:fill-gray-300"
                          />
                          <YAxis
                            yAxisId="hours"
                            orientation="right"
                            tickFormatter={(value) => `${value}h`}
                            tick={{ fill: '#6B7280' }}
                            className="dark:[&_text]:fill-gray-400"
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === 'totalHours') {
                                return [`${value.toFixed(1)}h`, 'Total Hours'];
                              }
                              return [`$${formatCurrency(value)}`, name];
                            }}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #E5E7EB',
                              borderRadius: '6px'
                            }}
                            labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="rect"
                            content={(props) => {
                              const { payload } = props;
                              const customOrder = ['Promotion', 'Low', 'Medium', 'High'];
                              const orderedPayload = customOrder.map(key =>
                                payload?.find(item => item.value === key)
                              ).filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

                              const toggleUrgency = (urgency: string) => {
                                setVisibleUrgencies(prev => ({
                                  ...prev,
                                  [urgency]: !prev[urgency]
                                }));
                              };

                              const resetFilters = () => {
                                setVisibleUrgencies({
                                  Promotion: true,
                                  Low: true,
                                  Medium: true,
                                  High: true
                                });
                              };

                              // Check if filters have been modified from default (all true)
                              const isModified = Object.values(visibleUrgencies).some(value => !value);

                              return (
                                <div>
                                  {/* Interactive legend items */}
                                  <ul style={{
                                    listStyle: 'none',
                                    margin: 0,
                                    padding: 0,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '20px'
                                  }}>
                                    {orderedPayload.map((entry, index) => entry ? (
                                      <li
                                        key={`item-${index}`}
                                        onClick={() => toggleUrgency(entry.value || '')}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          cursor: 'pointer',
                                          opacity: visibleUrgencies[entry.value || ''] ? 1 : 0.35,
                                          transition: 'all 0.2s ease',
                                          userSelect: 'none'
                                        }}
                                      >
                                        <span style={{
                                          display: 'inline-block',
                                          width: '14px',
                                          height: '14px',
                                          borderRadius: '4px',
                                          backgroundColor: entry.value === 'Promotion' ? '#60A5FA' : entry.color,
                                          backgroundImage: entry.value === 'Promotion' && visibleUrgencies[entry.value || '']
                                            ? 'repeating-linear-gradient(45deg, #60A5FA, #60A5FA 2px, #1E40AF 2px, #1E40AF 4px)'
                                            : entry.value === 'Promotion'
                                            ? 'repeating-linear-gradient(45deg, #D1D5DB, #D1D5DB 2px, #9CA3AF 2px, #9CA3AF 4px)'
                                            : 'none',
                                          opacity: visibleUrgencies[entry.value || ''] ? 1 : 0.5
                                        }} />
                                        <span style={{ color: visibleUrgencies[entry.value || ''] ? '#374151' : '#9CA3AF' }}>
                                          {entry.value}
                                        </span>
                                      </li>
                                    ) : null)}

                                    {/* Reset button - only shows when filters are modified */}
                                    {isModified && (
                                      <>
                                        <li style={{
                                          width: '1px',
                                          height: '20px',
                                          backgroundColor: '#E5E7EB',
                                          margin: '0 10px'
                                        }} />
                                        <li
                                          onClick={resetFilters}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            padding: '2px 10px',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            color: '#6B7280',
                                            backgroundColor: 'transparent',
                                            transition: 'all 0.2s ease',
                                            userSelect: 'none',
                                            border: '1px solid transparent'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#3B82F6';
                                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                                            e.currentTarget.style.borderColor = '#BFDBFE';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '#6B7280';
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.borderColor = 'transparent';
                                          }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                            <path d="M21 3v5h-5" />
                                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                            <path d="M8 21H3v-5" />
                                          </svg>
                                          Reset
                                        </li>
                                      </>
                                    )}
                                  </ul>
                                </div>
                              );
                            }}
                          />
                          <Bar yAxisId="cost" dataKey="High" stackId="a" fill={visibleUrgencies.High ? "#1E40AF" : "#D1D5DB"} />
                          <Bar yAxisId="cost" dataKey="Medium" stackId="a" fill={visibleUrgencies.Medium ? "#3B82F6" : "#D1D5DB"} />
                          <Bar yAxisId="cost" dataKey="Low" stackId="a" fill={visibleUrgencies.Low ? "#93C5FD" : "#D1D5DB"} />
                          <Bar yAxisId="cost" dataKey="Promotion" stackId="a" fill={visibleUrgencies.Promotion ? "url(#diagonalStripesMonthly)" : "#D1D5DB"} />
                          <Line yAxisId="hours" dataKey="totalHours" stroke="#DC2626" strokeWidth={3} dot={{ fill: '#DC2626', r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    );
                  } else if (filteredCosts) {
                    // Transform data for service tier view
                    const chartData = [
                      { name: 'Promotion', hours: filteredCosts.promotionalHours, cost: filteredCosts.promotionalCost, fill: visibleUrgencies.Promotion ? 'url(#diagonalStripesTier)' : '#D1D5DB' },
                      { name: 'Low', hours: filteredCosts.regularHours, cost: filteredCosts.regularCost, fill: visibleUrgencies.Low ? '#93C5FD' : '#D1D5DB' },
                      { name: 'Medium', hours: filteredCosts.sameDayHours, cost: filteredCosts.sameDayCost, fill: visibleUrgencies.Medium ? '#3B82F6' : '#D1D5DB' },
                      { name: 'High', hours: filteredCosts.emergencyHours, cost: filteredCosts.emergencyCost, fill: visibleUrgencies.High ? '#1E40AF' : '#D1D5DB' },
                    ];

                    return (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                          <defs>
                            <pattern id="diagonalStripesTier" patternUnits="userSpaceOnUse" width="8" height="8">
                              <rect width="8" height="8" fill="#60A5FA" className="dark:fill-slate-300" />
                              <path d="M0,8 L8,0" stroke="#1E40AF" strokeWidth="2" className="dark:stroke-slate-600" />
                              <path d="M-2,2 L2,-2" stroke="#1E40AF" strokeWidth="2" className="dark:stroke-slate-600" />
                              <path d="M6,10 L10,6" stroke="#1E40AF" strokeWidth="2" className="dark:stroke-slate-600" />
                            </pattern>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#374151' }}
                            className="dark:[&_text]:fill-gray-300"
                          />
                          <YAxis
                            tickFormatter={(value) => `$${(value).toLocaleString()}`}
                            tick={{ fill: '#374151' }}
                            className="dark:[&_text]:fill-gray-300"
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              name === 'cost' ? `$${formatCurrency(value)}` : `${value.toFixed(2)} hours`,
                              name === 'cost' ? 'Cost' : 'Hours'
                            ]}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #E5E7EB',
                              borderRadius: '6px'
                            }}
                            labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="cost" name="Cost" shape={(props: any) => {
                            const { fill, x, y, width, height } = props;
                            return <rect x={x} y={y} width={width} height={height} fill={props.payload.fill || fill} />;
                          }} />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  }
                  return null;
                })()
              )}
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
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
      </div>

      {/* Request Table */}
      <Card>
        {/* Sticky Header for Billable Requests */}
        <CardHeader className="sticky top-16 z-30 bg-card border-b border-border rounded-t-lg">
          <div className="space-y-3">
            {/* Title Row */}
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Billable Requests</CardTitle>
                <CardDescription>Complete list of support requests - click category or urgency to edit</CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                {/* Toggle for Non-Billable Items */}
                <div className="flex flex-col space-y-1">
                  <label className="flex items-center cursor-pointer group">
                    {/* OFF indicator */}
                    <span className={`text-xs font-medium mr-2 transition-opacity ${hideNonBillable ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      OFF
                    </span>

                    {/* Toggle Switch */}
                    <div className="relative">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={hideNonBillable}
                        onChange={(e) => setHideNonBillable(e.target.checked)}
                        aria-checked={hideNonBillable}
                        aria-label={`Show only billable items. Currently ${hideNonBillable ? 'showing only billable' : 'showing all'} items`}
                        className="sr-only"
                        id="billable-toggle"
                      />
                      <div className={`block w-12 h-7 rounded-full transition-all duration-300 ${
                        hideNonBillable
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`absolute left-0.5 top-0.5 bg-white dark:bg-gray-200 w-6 h-6 rounded-full transition-transform duration-300 flex items-center justify-center ${
                          hideNonBillable ? 'transform translate-x-5' : ''
                        }`}>
                          {/* Eye icon that changes based on state */}
                          {hideNonBillable ? (
                            <Eye className="w-3 h-3 text-blue-600 dark:text-blue-500" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ON indicator */}
                    <span className={`text-xs font-medium ml-2 mr-3 transition-opacity ${hideNonBillable ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-muted-foreground/50'}`}>
                      ON
                    </span>

                    {/* Label with count */}
                    <span className="text-sm font-medium text-foreground">
                      Show only billable
                      {nonBillableRequests.length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({hideNonBillable ? billableFilteredRequests.length : filteredAndSortedRequests.length} of {requests.filter(r => r.Status === 'active').length})
                        </span>
                      )}
                    </span>
                  </label>

                  {/* Helper text */}
                  {nonBillableRequests.length > 0 && (
                    <p className="text-xs text-muted-foreground pl-16">
                      {hideNonBillable
                        ? `Hiding ${nonBillableRequests.length} non-billable and migration items`
                        : 'Showing all items including non-billable'}
                    </p>
                  )}
                </div>
                {false && (
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
                  <span className="text-xs text-muted-foreground">Category:</span>
                  <select
                    value={stagedBulkCategory}
                    onChange={(e) => setStagedBulkCategory(e.target.value)}
                    className="text-xs text-foreground border border-border rounded px-2 py-1 bg-background min-w-[100px]"
                  >
                    <option value="">Change to...</option>
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk Urgency Change */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">Urgency:</span>
                  <select
                    value={stagedBulkUrgency}
                    onChange={(e) => setStagedBulkUrgency(e.target.value)}
                    className="text-xs text-foreground border border-border rounded px-2 py-1 bg-background min-w-[90px]"
                  >
                    <option value="">Change to...</option>
                    {urgencyOptions.map(urgency => (
                      <option key={urgency} value={urgency}>{urgency}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk Hours Change */}
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">Hours:</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    value={stagedBulkHours !== null ? stagedBulkHours : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setStagedBulkHours(null);
                      } else {
                        const numValue = parseFloat(value);
                        setStagedBulkHours(isNaN(numValue) ? null : numValue);
                      }
                    }}
                    placeholder="Set hours..."
                    className="text-xs text-foreground border border-border rounded px-2 py-1 bg-background min-w-[90px]"
                  />
                </div>

                {/* Action Buttons */}
                {(stagedBulkCategory || stagedBulkUrgency || stagedBulkHours !== null) ? (
                  <>
                    <button
                      onClick={applyBulkChanges}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors font-medium"
                    >
                      Apply Changes
                    </button>
                    <button
                      onClick={clearStagedChanges}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
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
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent transition-colors"
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
                  className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    className="rounded border-border focus:ring-blue-500"
                    title="Select all visible requests on this page"
                  />
                </TableHead>
                <TableHead className="w-16">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('source')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle source filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.source ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-xs">Source</span>
                    </div>
                    {showFilters.source && (
                      <div className="w-full text-xs border border-border rounded p-2 bg-card">
                        {['sms', 'ticket', 'email', 'phone'].map(source => (
                          <label key={source} className="flex items-center space-x-1 mb-1 cursor-pointer hover:bg-muted/50 rounded px-1">
                            <input
                              type="checkbox"
                              checked={sourceFilter.includes(source)}
                              onChange={(e) => {
                                preserveScrollPosition();
                                const newFilter = e.target.checked
                                  ? [...sourceFilter, source]
                                  : sourceFilter.filter(s => s !== source);
                                setSourceFilter(newFilter);
                                setCurrentPage(1);
                                setSelectedRequestIds(new Set());
                                setSelectAll(false);
                              }}
                              className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="capitalize">{source === 'sms' ? 'Text' : source === 'email' ? 'Email' : source === 'phone' ? 'Phone' : 'Ticket'}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead className="min-w-[110px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('date')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle date filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.date ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
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
                        className="w-full text-xs text-foreground border border-border rounded px-1 py-0.5 bg-background"
                      >
                        <option value="all">All Dates</option>
                        {getUniqueDates().map(date => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-20">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleColumnFilter('day')}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Toggle day filter"
                      >
                        <Filter className={`w-3 h-3 transition-colors ${
                          showFilters.day ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
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
                      <div className="w-full text-xs border border-border rounded p-2 bg-card">
                        {getUniqueDays().map(day => (
                          <label key={day} className="flex items-center space-x-1 hover:bg-accent p-1 rounded cursor-pointer">
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
                              className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
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
                          showFilters.category ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
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
                      <div className="w-full text-xs border border-border rounded p-2 bg-card max-h-40 overflow-y-auto">
                        {categoryOptions.map(category => {
                          // Count how many items have this category in the current view
                          const count = requests.filter(request => {
                            const requestDate = parseLocalDate(request.Date);
                            const requestYear = requestDate.getFullYear();
                            const requestMonth = requestDate.getMonth() + 1;
                            if (requestYear !== selectedYear) return false;
                            if (selectedMonth !== 'all' && requestMonth !== selectedMonth) return false;
                            if (selectedDay !== 'all' && request.Date !== selectedDay) return false;
                            return request.Category === category;
                          }).length;

                          return (
                            <label key={category} className="flex items-center space-x-1 hover:bg-accent p-1 rounded cursor-pointer">
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
                              className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="truncate">{category}</span>
                            {count > 0 && (
                              <span className="text-muted-foreground ml-auto">({count})</span>
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
                          showFilters.urgency ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'
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
                      <div className="w-full text-xs border border-border rounded p-2 bg-card">
                        {getUniqueUrgencies().map(urgency => (
                          <label key={urgency} className="flex items-center space-x-1 hover:bg-accent p-1 rounded cursor-pointer">
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
                              className="rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                            />
                            <span>{formatUrgencyDisplay(urgency)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('EstimatedHours')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                  >
                    <span>Hours</span>
                    {getSortIcon('EstimatedHours')}
                  </button>
                </TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
                const isNonBillable = request.Category === 'Non-billable';
                const isMigration = request.Category === 'Migration';
                return (
                  <TableRow 
                    key={filteredIndex} 
                    className={`cursor-pointer transition-colors ${
                      isNonBillable ? 'opacity-50 bg-gray-50' : isMigration ? 'bg-gray-50/30' : ''
                    } ${
                      selectedRequestIds.has(actualIndex) ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                    }`}
                    onClick={(e) => handleRowClick(actualIndex, e)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRequestIds.has(actualIndex)}
                        onChange={(e) => handleSelectRequest(actualIndex, e as any)}
                        className="rounded border-border focus:ring-blue-500"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center justify-center">
                              {request.source === 'ticket' ? (
                                <Ticket className="h-4 w-4 text-green-500" aria-label="Request via Ticket System" />
                              ) : request.source === 'email' ? (
                                <Mail className="h-4 w-4 text-purple-500" aria-label="Request via Email" />
                              ) : request.source === 'phone' ? (
                                <Phone className="h-4 w-4 text-orange-500" aria-label="Request via Phone" />
                              ) : (
                                <MessageCircle className="h-4 w-4 text-blue-500" aria-label="Request via Text" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Via {request.source === 'sms' ? 'Text' : request.source === 'ticket' ? 'Ticket System' : request.source === 'email' ? 'Email' : request.source === 'phone' ? 'Phone' : 'Text'}</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className={isNonBillable ? 'text-gray-400' : isMigration ? 'text-gray-500' : ''}>{request.Date}</TableCell>
                    <TableCell className={`text-sm ${isNonBillable ? 'text-muted-foreground opacity-60' : isMigration ? 'text-muted-foreground opacity-75' : 'text-muted-foreground'}`}>{getDayOfWeek(request.Date)}</TableCell>
                    <TableCell className={isNonBillable ? 'text-gray-400' : isMigration ? 'text-gray-500' : ''}>{formatTime(request.Time)}</TableCell>
                    <TableCell className="min-w-[200px] max-w-md">
                      <div className={`whitespace-pre-wrap break-words ${isNonBillable ? 'text-gray-400' : isMigration ? 'text-gray-500' : ''}`}>
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
                      {isNonBillable ? (
                        <span className="px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded-full">
                          N/A
                        </span>
                      ) : (
                        <EditableNumberCell
                          value={request.EstimatedHours != null ? request.EstimatedHours : 0.50}
                          urgency={request.Urgency}
                          onSave={(newValue) => {
                            console.log('Hours EditableNumberCell onSave called with:', newValue);
                            if (actualIndex !== -1) {
                              updateRequest(actualIndex, 'EstimatedHours', newValue);
                            } else {
                              console.error('Could not find request in original array');
                            }
                          }}
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
                <Archive className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-muted-foreground">
                  Archived Requests ({archivedRequests.length})
                </h3>
              </div>
              <span className="text-sm text-muted-foreground">
                Click to {showArchived ? 'hide' : 'show'}
              </span>
            </div>

            {showArchived && (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedRequests.map((request) => {
                      const originalIndex = requests.findIndex(r => r === request);
                      return (
                        <TableRow key={originalIndex} className="opacity-60">
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center justify-center">
                                    {request.source === 'ticket' ? (
                                      <Ticket className="h-4 w-4 text-green-500" aria-label="Request via Ticket System" />
                                    ) : request.source === 'email' ? (
                                      <Mail className="h-4 w-4 text-purple-500" aria-label="Request via Email" />
                                    ) : request.source === 'phone' ? (
                                      <Phone className="h-4 w-4 text-orange-500" aria-label="Request via Phone" />
                                    ) : (
                                      <MessageCircle className="h-4 w-4 text-blue-500" aria-label="Request via Text" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Via {request.source === 'sms' ? 'Text' : request.source === 'ticket' ? 'Ticket System' : request.source === 'email' ? 'Email' : request.source === 'phone' ? 'Phone' : 'Text'}</p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-sm">
                            {parseLocalDate(request.Date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">{request.Time}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {request.Category || 'Support'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="text-sm text-muted-foreground whitespace-normal break-words">
                              {request.Request_Summary}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.Urgency === 'HIGH'
                                ? 'bg-red-100 text-red-800'
                                : request.Urgency === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.Urgency === 'PROMOTION'
                                ? 'bg-purple-100 text-purple-800'
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
