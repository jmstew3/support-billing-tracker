import { useMemo } from 'react';
import type { ChatRequest } from '../../../types/request';
import { parseLocalDate, parseTimeToMinutes, getDayOfWeek } from '../../../utils/supportHelpers';
import { calculateCosts } from '../../../utils/dataProcessing';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface ActivityMetrics {
  mostActiveDay: {
    dates: string[];
    count: number;
    displayText: string;
    subtitle: string;
  };
  mostActiveTimeRange: {
    range: string;
    count: number;
  };
  busiestDayOfWeek: {
    day: string;
    count: number;
  };
  topCategory: {
    category: string;
    count: number;
    percentage: number;
  };
}

export interface CategoryData {
  support: number;
  hosting: number;
  forms: number;
  email: number;
  migration: number;
  advisory: number;
  nonBillable: number;
  website: number;
  total: number;
}

export interface MonthlyCategoryData {
  month: string;
  year: number;
  categories: CategoryData;
}

export interface MonthlyCosts {
  month: string;
  year: number;
  costs: any; // From calculateCosts utility
}

export function useSupportMetrics(
  requests: ChatRequest[],
  selectedYear: number,
  selectedMonth: number | 'all'
) {
  // Activity metrics
  const activityMetrics = useMemo((): ActivityMetrics => {
    const getMostActiveDay = (reqs: ChatRequest[]) => {
      if (reqs.length === 0) return { dates: [], count: 0, displayText: 'N/A', subtitle: '' };

      const dayCount: Record<string, number> = {};
      reqs.forEach(request => {
        dayCount[request.Date] = (dayCount[request.Date] || 0) + 1;
      });

      let maxCount = 0;
      Object.values(dayCount).forEach(count => {
        if (count > maxCount) maxCount = count;
      });

      const topDates: string[] = [];
      Object.entries(dayCount).forEach(([date, count]) => {
        if (count === maxCount) {
          topDates.push(date);
        }
      });

      topDates.sort();

      let displayText = 'N/A';
      let subtitle = '';

      if (topDates.length === 1) {
        const [year, month, day] = topDates[0].split('-').map(Number);
        const date = new Date(year, month - 1, day);
        displayText = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      } else if (topDates.length === 2) {
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
        displayText = `${topDates.length} days tied`;
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

      return { dates: topDates, count: maxCount, displayText, subtitle };
    };

    const getMostActiveTimeRange = (reqs: ChatRequest[]) => {
      if (reqs.length === 0) return { range: 'N/A', count: 0 };

      const ranges = {
        'Morning (8AM-12PM)': 0,
        'Afternoon (12PM-4PM)': 0,
        'Evening (4PM-6PM)': 0,
        'Night (6PM-10PM)': 0,
        'Late Night (10PM-8AM)': 0
      };

      reqs.forEach(request => {
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

    const getBusiestDayOfWeek = (reqs: ChatRequest[]) => {
      if (reqs.length === 0) return { day: 'N/A', count: 0 };

      const dayCount: Record<string, number> = {};

      reqs.forEach(request => {
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

    const getTopCategory = (reqs: ChatRequest[]) => {
      if (reqs.length === 0) return { category: 'N/A', count: 0, percentage: 0 };

      const categoryCount: Record<string, number> = {};
      reqs.forEach(request => {
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

      const percentage = reqs.length > 0 ? Math.round((maxCount / reqs.length) * 100) : 0;

      return { category: maxCategory || 'N/A', count: maxCount, percentage };
    };

    return {
      mostActiveDay: getMostActiveDay(requests),
      mostActiveTimeRange: getMostActiveTimeRange(requests),
      busiestDayOfWeek: getBusiestDayOfWeek(requests),
      topCategory: getTopCategory(requests),
    };
  }, [requests]);

  // Category data calculation
  const calculateCategoryData = (reqs: ChatRequest[]): CategoryData => {
    const categories: CategoryData = {
      support: 0,
      hosting: 0,
      forms: 0,
      email: 0,
      migration: 0,
      advisory: 0,
      nonBillable: 0,
      website: 0,
      total: 0,
    };

    reqs.forEach(request => {
      const category = request.Category || 'Support';
      categories.total++;

      switch (category.toLowerCase()) {
        case 'support':
          categories.support++;
          break;
        case 'hosting':
          categories.hosting++;
          break;
        case 'forms':
          categories.forms++;
          break;
        case 'email':
          categories.email++;
          break;
        case 'migration':
          categories.migration++;
          break;
        case 'advisory':
          categories.advisory++;
          break;
        case 'non-billable':
          categories.nonBillable++;
          break;
        case 'website':
          categories.website++;
          break;
        default:
          categories.support++;
          break;
      }
    });

    return categories;
  };

  // Monthly costs calculation
  const monthlyCosts = useMemo((): MonthlyCosts[] | null => {
    if (selectedMonth !== 'all') return null;

    const costs: MonthlyCosts[] = [];
    const requestsByMonth = new Map<string, ChatRequest[]>();

    // Filter to billable requests only
    const billableReqs = requests.filter(request =>
      request.Status === 'active' &&
      request.Category !== 'Non-billable' &&
      request.Category !== 'Migration'
    );

    billableReqs.forEach(request => {
      const requestDate = parseLocalDate(request.Date);
      const year = requestDate.getFullYear();
      const month = requestDate.getMonth() + 1;

      if (year === selectedYear) {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        if (!requestsByMonth.has(key)) {
          requestsByMonth.set(key, []);
        }
        requestsByMonth.get(key)!.push(request);
      }
    });

    Array.from(requestsByMonth.keys())
      .sort()
      .forEach(key => {
        const [year, month] = key.split('-').map(Number);
        const monthRequests = requestsByMonth.get(key)!;
        const monthlyCostData = calculateCosts(monthRequests, key);

        costs.push({
          month: monthNames[month - 1],
          year,
          costs: monthlyCostData
        });
      });

    return costs;
  }, [requests, selectedYear, selectedMonth]);

  // Monthly category data
  const monthlyCategoryData = useMemo((): MonthlyCategoryData[] | null => {
    if (selectedMonth !== 'all') return null;

    const data: MonthlyCategoryData[] = [];
    const requestsByMonth = new Map<string, ChatRequest[]>();

    requests.forEach(request => {
      const requestDate = parseLocalDate(request.Date);
      const year = requestDate.getFullYear();
      const month = requestDate.getMonth() + 1;

      if (year === selectedYear) {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        if (!requestsByMonth.has(key)) {
          requestsByMonth.set(key, []);
        }
        requestsByMonth.get(key)!.push(request);
      }
    });

    Array.from(requestsByMonth.keys())
      .sort()
      .forEach(key => {
        const [year, month] = key.split('-').map(Number);
        const monthRequests = requestsByMonth.get(key)!;
        const categories = calculateCategoryData(monthRequests);

        data.push({
          month: monthNames[month - 1],
          year,
          categories,
        });
      });

    return data.length > 0 ? data : null;
  }, [requests, selectedYear, selectedMonth]);

  // Single period category data
  const categoryBreakdownData = useMemo(() => {
    if (selectedMonth === 'all') return null;
    return calculateCategoryData(requests);
  }, [requests, selectedMonth]);

  return {
    activityMetrics,
    monthlyCosts,
    monthlyCategoryData,
    categoryBreakdownData,
  };
}
