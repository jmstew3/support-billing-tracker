# Hosting & Billing Policy

## Overview

This document defines the billing rules for website hosting services starting June 2025. Our hosting service charges $99/month per active website with proration for partial months and a free credit system for high-volume clients.

## Base Pricing

- **Standard Monthly Rate**: $99 per website
- **Billing Cycle**: Monthly, billed in arrears
- **Start Date**: June 2025 (historical billing tracking begins here)

## Proration Rules

### Partial Month Calculations

When a website's hosting starts or ends mid-month, charges are prorated based on the number of active days:

```
Prorated Amount = (Days Active / Total Days in Month) × $99
```

### Start Date Proration

**Formula**:
```
Days Active = (Last Day of Month - Start Day) + 1
Prorated Charge = (Days Active / Days in Month) × $99
```

**Example**: Site starts June 15, 2025 (30-day month)
- Days Active: (30 - 15) + 1 = 16 days
- Charge: (16 / 30) × $99 = $52.80

### End Date Proration

**Formula**:
```
Days Active = End Day
Prorated Charge = (Days Active / Days in Month) × $99
```

**Example**: Site ends July 20, 2025 (31-day month)
- Days Active: 20 days
- Charge: (20 / 31) × $99 = $63.87

### Full Month Billing

If a site is active for the entire month (no start/end date within that month), charge the full $99.

## Free Credit System

### The 20-Site Rule

For every 20 paid hosting sites, clients receive 1 free hosting credit.

**Formula**:
```
Free Credits Available = floor(Active Paid Sites / 21)
```

**Rationale**: We use 21 as the divisor because the 21st site triggers the first free credit (20 paid + 1 free = 21 total).

### Credit Application Logic

1. **Calculate Active Sites**: Count all sites with active hosting in the billing month
2. **Calculate Credits**: Use formula above to determine available credits
3. **Apply Credits**: Waive the $99 charge for the number of sites equal to available credits
4. **Credit Selection**: Apply credits to full-month charges first, then prorated charges (highest to lowest)

### Examples

**Example 1**: Client has 25 active sites
- Free Credits: floor(25 / 21) = 1 credit
- Billing: 24 sites × $99 + 1 site × $0 = $2,376

**Example 2**: Client has 42 active sites
- Free Credits: floor(42 / 21) = 2 credits
- Billing: 40 sites × $99 + 2 sites × $0 = $3,960

**Example 3**: Client has 63 active sites
- Free Credits: floor(63 / 21) = 3 credits
- Billing: 60 sites × $99 + 3 sites × $0 = $5,940

### Credit Progress Tracking

Show clients their progress toward the next free credit:

```
Sites Toward Next Credit = Active Sites % 21
Progress = (Sites Toward Next Credit / 21) × 100%
```

**Example**: 17 active sites
- Progress: (17 / 21) × 100% = 81% toward first free credit
- Display: "17/21 sites toward next free credit"

## Edge Cases

### Same-Day Start and End

If `hostingStart` and `hostingEnd` are the same date:
- Charge for 1 day: `(1 / Days in Month) × $99`

### Month Boundary Edge Cases

1. **Site starts on 1st**: Full month charge
2. **Site ends on last day**: Full month charge
3. **Site active entire month**: Full month charge
4. **Site starts and ends in same month**: Prorate for days active

### Inactive Sites

If `hostingEnd` date has passed:
- Exclude from active site count
- Do not bill for months after end date
- Do not count toward free credit calculation

### Missing Dates

- **No `hostingStart`**: Assume active from beginning of tracking (June 1, 2025)
- **No `hostingEnd`**: Assume currently active (bill through current month)

## Calculation Examples

### Scenario 1: Full Month Billing

**Site**: "Peak One Digital"
- Start: May 1, 2025
- End: None (active)
- Month: June 2025 (30 days)

**Calculation**: Site active entire month
- Charge: $99.00

### Scenario 2: Start Mid-Month

**Site**: "Guardian Window Tinting"
- Start: June 15, 2025
- End: None (active)
- Month: June 2025 (30 days)

**Calculation**:
- Days Active: (30 - 15) + 1 = 16 days
- Charge: (16 / 30) × $99 = $52.80

### Scenario 3: End Mid-Month

**Site**: "Auto Concierge"
- Start: April 1, 2025
- End: July 20, 2025
- Month: July 2025 (31 days)

**Calculation**:
- Days Active: 20 days
- Charge: (20 / 31) × $99 = $63.87

### Scenario 4: Start and End Same Month

**Site**: "Temporary Landing Page"
- Start: August 5, 2025
- End: August 18, 2025
- Month: August 2025 (31 days)

**Calculation**:
- Days Active: (18 - 5) + 1 = 14 days
- Charge: (14 / 31) × $99 = $44.71

### Scenario 5: Free Credits Applied

**Client**: 22 active sites in September 2025
- Free Credits: floor(22 / 21) = 1 credit
- Gross Billing: 22 × $99 = $2,178
- Credits Applied: 1 × $99 = $99
- Net Billing: $2,178 - $99 = $2,079

## Display and Reporting

### Monthly Billing Dashboard

Display the following metrics:
1. **Active Sites**: Total count of sites with active hosting
2. **Gross MRR**: Total hosting charges before credits
3. **Free Credits**: Number of credits available this month
4. **Net MRR**: Gross MRR minus credits applied

### Monthly Calculator Table

For each month, show a detailed breakdown:
- Site Name
- Hosting Start Date
- Hosting End Date (if applicable)
- Billing Type (Full / Prorated Start / Prorated End)
- Days Active
- Gross Amount
- Credits Applied
- Net Amount

### Color Coding

- **Green**: Full month billing ($99)
- **Blue**: Prorated start (partial first month)
- **Orange**: Prorated end (partial last month)
- **Gray**: Inactive/ended sites (not billed)

## Implementation Notes

### Data Source

All hosting data comes from Twenty CRM's `websiteProperties` object via REST API:
- Endpoint: `https://twenny.peakonedigital.com/rest/websiteProperties`
- Required Fields:
  - `id`: Unique identifier
  - `name`: Website name
  - `hostingStart`: ISO date string (YYYY-MM-DD)
  - `hostingEnd`: ISO date string or null
  - `hostingMrrAmount`: Object with `amountMicros` and `currencyCode`

### Calculation Timing

- Run calculations monthly for the previous month
- Historical calculations can be run for June 2025 onward
- Real-time dashboard shows current month-to-date

### Rounding

- All currency values should be rounded to 2 decimal places
- Use banker's rounding (round half to even) for consistency

## Revision History

- **2025-09-30**: Initial policy document created