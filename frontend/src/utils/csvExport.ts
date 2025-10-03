/**
 * CSV Export Utility
 *
 * Provides functions for generating and downloading CSV files from table data.
 * Supports dynamic column generation based on time period selection.
 */

/**
 * Escapes special characters in CSV fields
 */
function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);

  // If the field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates CSV content from headers and rows
 */
export function generateCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const csvHeaders = headers.map(escapeCSVField).join(',');
  const csvRows = rows.map(row => row.map(escapeCSVField).join(','));

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Triggers browser download of CSV file
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Formats currency values for CSV export
 * Removes $ symbol for better spreadsheet compatibility
 */
export function formatCurrencyForCSV(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Formats date for CSV export
 */
export function formatDateForCSV(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === '-') return '-';

  try {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateStr;
  }
}

/**
 * Export revenue tracker data to CSV
 */
export interface RevenueExportData {
  monthlyData: {
    month: string;
    ticketsRevenue: number;
    projectsRevenue: number;
    hostingRevenue: number;
    ticketsCount: number;
    projectsCount: number;
    hostingSitesCount: number;
  }[];
  totals: {
    tickets: number;
    projects: number;
    hosting: number;
    ticketsCount: number;
    projectsCount: number;
    hostingCount: number;
  };
}

export function exportRevenueData(data: RevenueExportData, selectedPeriod: string = 'all'): void {
  const { monthlyData, totals } = data;

  // Build dynamic headers based on the months in the data
  const headers = ['#', 'Category'];
  const monthColumns = monthlyData.map(m => {
    const [year, month] = m.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return monthName;
  });
  headers.push(...monthColumns, 'Count', 'Total');

  // Build data rows
  const rows: (string | number)[][] = [
    ['1', 'Tickets',
      ...monthlyData.map(m => formatCurrencyForCSV(m.ticketsRevenue)),
      totals.ticketsCount,
      formatCurrencyForCSV(totals.tickets)
    ],
    ['2', 'Projects',
      ...monthlyData.map(m => formatCurrencyForCSV(m.projectsRevenue)),
      totals.projectsCount,
      formatCurrencyForCSV(totals.projects)
    ],
    ['3', 'Hosting',
      ...monthlyData.map(m => formatCurrencyForCSV(m.hostingRevenue)),
      totals.hostingCount,
      formatCurrencyForCSV(totals.hosting)
    ]
  ];

  // Add total row
  const totalRevenue = monthlyData.map(m =>
    formatCurrencyForCSV(m.ticketsRevenue + m.projectsRevenue + m.hostingRevenue)
  );
  const grandTotal = formatCurrencyForCSV(totals.tickets + totals.projects + totals.hosting);
  const totalCount = totals.ticketsCount + totals.projectsCount + totals.hostingCount;

  rows.push([
    '', 'Total',
    ...totalRevenue,
    totalCount,
    grandTotal
  ]);

  const csv = generateCSV(headers, rows);
  const filename = selectedPeriod === 'all'
    ? 'revenue_tracker_all.csv'
    : `revenue_tracker_${selectedPeriod}.csv`;

  downloadCSV(filename, csv);
}

/**
 * Export hosting calculator data to CSV
 */
export interface HostingExportData {
  month: string;
  sites: {
    name: string;
    websiteUrl: string | null;
    hostingStart: string | null;
    hostingEnd: string | null;
    billingType: string;
    daysActive: number;
    grossAmount: number;
    creditAmount: number;
    netAmount: number;
  }[];
  totals: {
    gross: number;
    credits: number;
    net: number;
  };
}

export function exportHostingData(data: HostingExportData): void {
  const headers = [
    '#',
    'Website Name',
    'Hosting Start',
    'Hosting End',
    'Billing Type',
    'Days',
    'Gross',
    'Credit',
    'Net'
  ];

  // Build data rows
  const rows: (string | number)[][] = data.sites.map((site, index) => [
    index + 1,
    site.name,
    formatDateForCSV(site.hostingStart),
    formatDateForCSV(site.hostingEnd),
    site.billingType,
    site.daysActive,
    formatCurrencyForCSV(site.grossAmount),
    formatCurrencyForCSV(site.creditAmount),
    formatCurrencyForCSV(site.netAmount)
  ]);

  // Add total row
  rows.push([
    '',
    'Total',
    '-',
    '-',
    '-',
    '-',
    formatCurrencyForCSV(data.totals.gross),
    formatCurrencyForCSV(data.totals.credits),
    formatCurrencyForCSV(data.totals.net)
  ]);

  const csv = generateCSV(headers, rows);
  const filename = `hosting_breakdown_${data.month}.csv`;

  downloadCSV(filename, csv);
}

/**
 * Export monthly breakdown data to CSV
 */
export interface MonthlyBreakdownExportData {
  months: {
    month: string;
    ticketsRevenue: number;
    projectsRevenue: number;
    hostingRevenue: number;
    totalRevenue: number;
    // Detailed line items
    ticketsCount?: number;
    ticketDetails?: Array<{
      date: string;
      description: string;
      hours: number;
      rate: number;
      amount: number;
      netAmount?: number;
      freeHoursApplied?: number;
    }>;
    ticketsGrossRevenue?: number;
    ticketsFreeHoursApplied?: number;
    ticketsFreeHoursSavings?: number;
    projectsCount?: number;
    projectDetails?: Array<{
      name: string;
      completionDate: string;
      category: string;
      amount: number;
      originalAmount?: number;
      isFreeCredit?: boolean;
    }>;
    projectsGrossRevenue?: number;
    projectsLandingPageCredit?: number;
    projectsLandingPageSavings?: number;
    projectsMultiFormCredit?: number;
    projectsMultiFormSavings?: number;
    projectsBasicFormCredit?: number;
    projectsBasicFormSavings?: number;
    hostingSitesCount?: number;
    hostingDetails?: Array<{
      name: string;
      billingType: string;
      grossAmount: number;
      creditAmount: number;
      netAmount: number;
      hostingStart?: string | null;
      hostingEnd?: string | null;
    }>;
    hostingGross?: number;
    hostingCreditsApplied?: number;
  }[];
  totals?: {
    tickets: number;
    projects: number;
    hosting: number;
    total: number;
  };
}

export function exportMonthlyBreakdownData(data: MonthlyBreakdownExportData, selectedPeriod: string = 'all'): void {
  const headers = ['Month', 'Tickets', 'Projects', 'Hosting', 'Total Revenue'];

  // Build data rows
  const rows: (string | number)[][] = data.months.map(month => {
    const [year, monthNum] = month.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return [
      monthName,
      formatCurrencyForCSV(month.ticketsRevenue),
      formatCurrencyForCSV(month.projectsRevenue),
      formatCurrencyForCSV(month.hostingRevenue),
      formatCurrencyForCSV(month.totalRevenue)
    ];
  });

  // Add grand total row if there are multiple months and totals are provided
  if (data.months.length > 1 && data.totals) {
    rows.push([
      'GRAND TOTALS',
      formatCurrencyForCSV(data.totals.tickets),
      formatCurrencyForCSV(data.totals.projects),
      formatCurrencyForCSV(data.totals.hosting),
      formatCurrencyForCSV(data.totals.total)
    ]);
  }

  const csv = generateCSV(headers, rows);
  const filename = selectedPeriod === 'all'
    ? 'monthly_breakdown_all.csv'
    : `monthly_breakdown_${selectedPeriod}.csv`;

  downloadCSV(filename, csv);
}

/**
 * Export detailed monthly breakdown data to CSV with all line items
 */
export function exportMonthlyBreakdownDetailedData(data: MonthlyBreakdownExportData, selectedPeriod: string = 'all'): void {
  const headers = ['Type', 'Date', 'Description', 'Category', 'Hours', 'Rate', 'Amount'];
  const rows: (string | number)[][] = [];

  // Process each month
  data.months.forEach(month => {
    const [year, monthNum] = month.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Add month header row
    rows.push([
      'MONTH',
      monthName,
      '',
      '',
      '',
      '',
      formatCurrencyForCSV(month.totalRevenue)
    ]);

    // Add Tickets section if there are tickets
    if (month.ticketsCount && month.ticketsCount > 0) {
      rows.push([
        'SECTION',
        '',
        `Tickets (${month.ticketsCount})`,
        '',
        '',
        '',
        formatCurrencyForCSV(month.ticketsRevenue)
      ]);

      // Add individual ticket details
      if (month.ticketDetails) {
        month.ticketDetails.forEach((ticket, idx) => {
          rows.push([
            'DETAIL',
            ticket.date,
            ticket.description,
            'Support',
            ticket.hours.toFixed(2),
            formatCurrencyForCSV(ticket.rate),
            formatCurrencyForCSV(ticket.netAmount || ticket.amount)
          ]);
        });

        // Add tickets subtotal
        const totalHours = month.ticketDetails.reduce((sum, t) => sum + t.hours, 0);
        rows.push([
          'SUBTOTAL',
          '',
          'Total Ticket Hours',
          '',
          totalHours.toFixed(2),
          '',
          formatCurrencyForCSV(month.ticketsGrossRevenue || month.ticketsRevenue)
        ]);

        // Add free hours credit if applicable
        if (month.ticketsFreeHoursSavings && month.ticketsFreeHoursSavings > 0) {
          rows.push([
            'CREDIT',
            '',
            `Free Support Hours (${month.ticketsFreeHoursApplied}h)`,
            '',
            '',
            '',
            `-${formatCurrencyForCSV(month.ticketsFreeHoursSavings)}`
          ]);
        }
      }
    }

    // Add Projects section if there are projects
    if (month.projectsCount && month.projectsCount > 0) {
      rows.push([
        'SECTION',
        '',
        `Projects (${month.projectsCount})`,
        '',
        '',
        '',
        formatCurrencyForCSV(month.projectsRevenue)
      ]);

      // Add individual project details
      if (month.projectDetails) {
        month.projectDetails.forEach((project, idx) => {
          const displayAmount = project.isFreeCredit ? 0 : project.amount;
          rows.push([
            'DETAIL',
            project.completionDate,
            project.name,
            project.category,
            '',
            '',
            formatCurrencyForCSV(displayAmount)
          ]);
        });

        // Add projects subtotal
        rows.push([
          'SUBTOTAL',
          '',
          'Total Projects',
          '',
          '',
          '',
          formatCurrencyForCSV(month.projectsGrossRevenue || month.projectsRevenue)
        ]);

        // Add project credits if applicable
        if (month.projectsLandingPageSavings && month.projectsLandingPageSavings > 0) {
          rows.push([
            'CREDIT',
            '',
            `Free Landing Page Credit (${month.projectsLandingPageCredit})`,
            '',
            '',
            '',
            `-${formatCurrencyForCSV(month.projectsLandingPageSavings)}`
          ]);
        }
        if (month.projectsMultiFormSavings && month.projectsMultiFormSavings > 0) {
          rows.push([
            'CREDIT',
            '',
            `Free Multi-Form Credit (${month.projectsMultiFormCredit})`,
            '',
            '',
            '',
            `-${formatCurrencyForCSV(month.projectsMultiFormSavings)}`
          ]);
        }
        if (month.projectsBasicFormSavings && month.projectsBasicFormSavings > 0) {
          rows.push([
            'CREDIT',
            '',
            `Free Basic Form Credit (${month.projectsBasicFormCredit})`,
            '',
            '',
            '',
            `-${formatCurrencyForCSV(month.projectsBasicFormSavings)}`
          ]);
        }
      }
    }

    // Add Hosting section if there are hosting sites
    if (month.hostingSitesCount && month.hostingSitesCount > 0) {
      rows.push([
        'SECTION',
        '',
        `Hosting (${month.hostingSitesCount} sites)`,
        '',
        '',
        '',
        formatCurrencyForCSV(month.hostingRevenue)
      ]);

      // Add individual hosting details
      if (month.hostingDetails) {
        month.hostingDetails.forEach((site, idx) => {
          rows.push([
            'DETAIL',
            '',
            site.name,
            site.billingType,
            '',
            '',
            formatCurrencyForCSV(site.netAmount)
          ]);
        });

        // Add hosting subtotal
        rows.push([
          'SUBTOTAL',
          '',
          'Total Hosting',
          '',
          '',
          '',
          formatCurrencyForCSV(month.hostingGross || month.hostingRevenue)
        ]);

        // Add hosting credits if applicable
        if (month.hostingCreditsApplied && month.hostingCreditsApplied > 0) {
          const creditAmount = (month.hostingGross || month.hostingRevenue) - month.hostingRevenue;
          rows.push([
            'CREDIT',
            '',
            `Free Hosting Credits (${month.hostingCreditsApplied} sites)`,
            '',
            '',
            '',
            `-${formatCurrencyForCSV(creditAmount)}`
          ]);
        }
      }
    }

    // Add blank row between months
    rows.push(['', '', '', '', '', '', '']);
  });

  // Add grand total row if there are multiple months and totals are provided
  if (data.months.length > 1 && data.totals) {
    rows.push([
      'GRAND TOTAL',
      '',
      '',
      '',
      '',
      '',
      formatCurrencyForCSV(data.totals.total)
    ]);
  }

  const csv = generateCSV(headers, rows);
  const filename = selectedPeriod === 'all'
    ? 'monthly_breakdown_detailed_all.csv'
    : `monthly_breakdown_detailed_${selectedPeriod}.csv`;

  downloadCSV(filename, csv);
}