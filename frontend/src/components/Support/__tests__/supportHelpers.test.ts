/**
 * Baseline tests for Support helper functions
 * These tests establish behavioral baselines before refactoring
 */
import { describe, it, expect } from 'vitest'
import { parseLocalDate, parseTimeToMinutes, getDayOfWeek } from '../../../utils/supportHelpers'

describe('supportHelpers - parseLocalDate', () => {
  it('should parse YYYY-MM-DD format correctly', () => {
    const date = parseLocalDate('2025-06-23')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(5) // 0-indexed (June = 5)
    expect(date.getDate()).toBe(23)
  })

  it('should handle edge case dates', () => {
    // Start of year
    const jan1 = parseLocalDate('2025-01-01')
    expect(jan1.getMonth()).toBe(0)
    expect(jan1.getDate()).toBe(1)

    // End of year
    const dec31 = parseLocalDate('2025-12-31')
    expect(dec31.getMonth()).toBe(11)
    expect(dec31.getDate()).toBe(31)
  })

  it('should avoid timezone issues with YYYY-MM-DD format', () => {
    // parseLocalDate manually parses components to avoid UTC interpretation
    const date = parseLocalDate('2025-06-23')
    expect(date.getDate()).toBe(23)
    expect(date.getMonth()).toBe(5) // June (0-indexed)
    expect(date.getFullYear()).toBe(2025)
  })
})

describe('supportHelpers - parseTimeToMinutes', () => {
  it('should parse 12-hour AM times correctly', () => {
    expect(parseTimeToMinutes('8:47 AM')).toBe(8 * 60 + 47) // 527
    expect(parseTimeToMinutes('12:00 AM')).toBe(0) // Midnight
    expect(parseTimeToMinutes('12:30 AM')).toBe(30)
  })

  it('should parse 12-hour PM times correctly', () => {
    expect(parseTimeToMinutes('1:15 PM')).toBe(13 * 60 + 15) // 795
    expect(parseTimeToMinutes('12:00 PM')).toBe(12 * 60) // Noon = 720
    expect(parseTimeToMinutes('11:59 PM')).toBe(23 * 60 + 59) // 1439
  })

  it('should handle edge cases', () => {
    expect(parseTimeToMinutes('12:01 AM')).toBe(1) // Just after midnight
    expect(parseTimeToMinutes('12:01 PM')).toBe(12 * 60 + 1) // Just after noon
  })

  it('should parse times without leading zeros', () => {
    expect(parseTimeToMinutes('9:05 AM')).toBe(9 * 60 + 5)
    expect(parseTimeToMinutes('3:45 PM')).toBe(15 * 60 + 45)
  })
})

describe('supportHelpers - getDayOfWeek', () => {
  it('should return correct day names for known dates', () => {
    // June 23, 2025 is a Monday
    expect(getDayOfWeek('2025-06-23')).toBe('Mon')

    // June 24, 2025 is a Tuesday
    expect(getDayOfWeek('2025-06-24')).toBe('Tue')

    // June 25, 2025 is a Wednesday
    expect(getDayOfWeek('2025-06-25')).toBe('Wed')
  })

  it('should handle all days of the week', () => {
    // Week of June 23-29, 2025 (Mon-Sun)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const dates = [
      '2025-06-23', '2025-06-24', '2025-06-25',
      '2025-06-26', '2025-06-27', '2025-06-28', '2025-06-29'
    ]

    dates.forEach((date, i) => {
      expect(getDayOfWeek(date)).toBe(days[i])
    })
  })

  it('should handle edge case dates consistently', () => {
    // January 1, 2025 is a Wednesday
    expect(getDayOfWeek('2025-01-01')).toBe('Wed')

    // December 31, 2025 is a Wednesday
    expect(getDayOfWeek('2025-12-31')).toBe('Wed')
  })
})
