/**
 * Baseline tests for Support activity metric functions
 * These tests will be extracted into a separate utility file during refactoring
 */
import { describe, it, expect } from 'vitest'
import type { ChatRequest } from '../../../types/request'

// These functions will be extracted during refactoring
// For now, we'll copy them here for testing

import { parseTimeToMinutes, getDayOfWeek } from '../../../utils/supportHelpers'

const getMostActiveDay = (requests: ChatRequest[]) => {
  if (requests.length === 0) return { dates: [], count: 0, displayText: 'N/A', subtitle: '' };

  const dayCount: Record<string, number> = {};
  requests.forEach(request => {
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

describe('activityMetrics - getMostActiveDay', () => {
  it('should return N/A for empty array', () => {
    const result = getMostActiveDay([])
    expect(result.displayText).toBe('N/A')
    expect(result.count).toBe(0)
    expect(result.dates).toEqual([])
  })

  it('should find single most active day', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-24', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveDay(requests)
    expect(result.count).toBe(2)
    expect(result.dates).toEqual(['2025-06-23'])
    expect(result.displayText).toContain('Jun')
    expect(result.displayText).toContain('23')
  })

  it('should handle two-way tie', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-24', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-24', Time: '11:00 AM', Request_Summary: 'Test 4', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveDay(requests)
    expect(result.count).toBe(2)
    expect(result.dates).toEqual(['2025-06-23', '2025-06-24'])
    expect(result.displayText).toContain('&')
  })

  it('should handle multi-way tie (>2 days)', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-24', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-25', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveDay(requests)
    expect(result.count).toBe(1)
    expect(result.dates).toHaveLength(3)
    expect(result.displayText).toBe('3 days tied')
    expect(result.subtitle).toBeTruthy()
  })

  it('should sort dates chronologically', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-25', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-24', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveDay(requests)
    expect(result.dates).toEqual(['2025-06-23', '2025-06-24', '2025-06-25'])
  })
})

describe('activityMetrics - getMostActiveTimeRange', () => {
  it('should return N/A for empty array', () => {
    const result = getMostActiveTimeRange([])
    expect(result.range).toBe('N/A')
    expect(result.count).toBe(0)
  })

  it('should identify morning requests (8AM-12PM)', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:30 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '11:45 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveTimeRange(requests)
    expect(result.range).toBe('Morning (8AM-12PM)')
    expect(result.count).toBe(3)
  })

  it('should identify afternoon requests (12PM-4PM)', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '12:00 PM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '2:30 PM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveTimeRange(requests)
    expect(result.range).toBe('Afternoon (12PM-4PM)')
    expect(result.count).toBe(2)
  })

  it('should identify evening requests (4PM-6PM)', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '4:00 PM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '5:30 PM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveTimeRange(requests)
    expect(result.range).toBe('Evening (4PM-6PM)')
    expect(result.count).toBe(2)
  })

  it('should identify night requests (6PM-10PM)', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '6:00 PM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:45 PM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveTimeRange(requests)
    expect(result.range).toBe('Night (6PM-10PM)')
    expect(result.count).toBe(2)
  })

  it('should identify late night requests (10PM-8AM)', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '10:00 PM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '2:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '7:30 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveTimeRange(requests)
    expect(result.range).toBe('Late Night (10PM-8AM)')
    expect(result.count).toBe(3)
  })

  it('should handle edge cases at range boundaries', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '11:59 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '12:00 PM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
    ]

    const result = getMostActiveTimeRange(requests)
    // 11:59 AM = Morning, 12:00 PM = Afternoon (tied at 1 each)
    expect(['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)']).toContain(result.range)
    expect(result.count).toBe(1)
  })
})

describe('activityMetrics - getBusiestDayOfWeek', () => {
  it('should return N/A for empty array', () => {
    const result = getBusiestDayOfWeek([])
    expect(result.day).toBe('N/A')
    expect(result.count).toBe(0)
  })

  it('should find busiest day of week', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Monday
      { Date: '2025-06-23', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Monday
      { Date: '2025-06-24', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Tuesday
    ]

    const result = getBusiestDayOfWeek(requests)
    expect(result.day).toBe('Mon')
    expect(result.count).toBe(2)
  })

  it('should handle all days of week', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Mon
      { Date: '2025-06-24', Time: '8:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Tue
      { Date: '2025-06-25', Time: '8:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Wed
      { Date: '2025-06-26', Time: '8:00 AM', Request_Summary: 'Test 4', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Thu
      { Date: '2025-06-27', Time: '8:00 AM', Request_Summary: 'Test 5', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Fri
      { Date: '2025-06-27', Time: '9:00 AM', Request_Summary: 'Test 6', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Fri (busiest)
      { Date: '2025-06-28', Time: '8:00 AM', Request_Summary: 'Test 7', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Sat
      { Date: '2025-06-29', Time: '8:00 AM', Request_Summary: 'Test 8', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 }, // Sun
    ]

    const result = getBusiestDayOfWeek(requests)
    expect(result.day).toBe('Fri')
    expect(result.count).toBe(2)
  })
})

describe('activityMetrics - getTopCategory', () => {
  it('should return N/A for empty array', () => {
    const result = getTopCategory([])
    expect(result.category).toBe('N/A')
    expect(result.count).toBe(0)
    expect(result.percentage).toBe(0)
  })

  it('should find top category', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Hosting', EstimatedHours: 0.5 },
    ]

    const result = getTopCategory(requests)
    expect(result.category).toBe('Support')
    expect(result.count).toBe(2)
    expect(result.percentage).toBe(67) // 2/3 = 66.67 rounded to 67
  })

  it('should default to Support for missing category', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: undefined as any, EstimatedHours: 0.5 },
    ]

    const result = getTopCategory(requests)
    expect(result.category).toBe('Support')
    expect(result.count).toBe(1)
    expect(result.percentage).toBe(100)
  })

  it('should calculate percentage correctly', () => {
    const requests: ChatRequest[] = [
      { Date: '2025-06-23', Time: '8:00 AM', Request_Summary: 'Test 1', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '9:00 AM', Request_Summary: 'Test 2', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '10:00 AM', Request_Summary: 'Test 3', Urgency: 'MEDIUM', Category: 'Support', EstimatedHours: 0.5 },
      { Date: '2025-06-23', Time: '11:00 AM', Request_Summary: 'Test 4', Urgency: 'MEDIUM', Category: 'Hosting', EstimatedHours: 0.5 },
    ]

    const result = getTopCategory(requests)
    expect(result.category).toBe('Support')
    expect(result.count).toBe(3)
    expect(result.percentage).toBe(75) // 3/4 = 0.75 = 75%
  })
})
