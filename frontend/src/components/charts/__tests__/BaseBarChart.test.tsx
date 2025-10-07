/**
 * BaseBarChart Test Component
 *
 * Quick test to verify the new base infrastructure works correctly.
 * This will be used to validate:
 * - chartConfig theme integration
 * - chartHelpers utility functions
 * - BaseBarChart rendering
 * - Tooltip components
 */

import { BaseBarChart } from '../BaseBarChart';
import { MonthlyTooltip } from '../tooltips/MonthlyTooltip';
import { CategoryTooltip } from '../tooltips/CategoryTooltip';
import { URGENCY_COLORS, REVENUE_COLORS } from '../../../config/chartConfig';
import { formatChartCurrency, calculateYAxisDomain } from '../../../utils/chartHelpers';

// Sample data for testing
const sampleMonthlyData = [
  { month: 'Jan 2025', low: 1200, medium: 3400, high: 2100 },
  { month: 'Feb 2025', low: 1800, medium: 4200, high: 1900 },
  { month: 'Mar 2025', low: 1500, medium: 3800, high: 2400 },
];

const sampleCategoryData = [
  { month: 'Jan 2025', support: 4500, hosting: 1200, forms: 800 },
  { month: 'Feb 2025', support: 5200, hosting: 1500, forms: 1200 },
  { month: 'Mar 2025', support: 4800, hosting: 1800, forms: 900 },
];

/**
 * Test Component 1: Urgency-based stacked bar chart
 */
export function TestUrgencyChart() {
  // Calculate Y-axis domain using helper
  const allValues = sampleMonthlyData.flatMap(d => [d.low, d.medium, d.high]);
  const [, yMax] = calculateYAxisDomain(allValues, 1000);

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Test 1: Urgency Chart with MonthlyTooltip</h3>
      <BaseBarChart
        data={sampleMonthlyData}
        bars={[
          { dataKey: 'low', name: 'Low', fill: URGENCY_COLORS.low, stackId: 'urgency' },
          { dataKey: 'medium', name: 'Medium', fill: URGENCY_COLORS.medium, stackId: 'urgency' },
          { dataKey: 'high', name: 'High', fill: URGENCY_COLORS.high, stackId: 'urgency' },
        ]}
        xAxisKey="month"
        yAxisConfig={{
          formatter: formatChartCurrency,
          domain: [0, yMax],
        }}
        customTooltip={MonthlyTooltip}
        height="standard"
        margin="standard"
      />
    </div>
  );
}

/**
 * Test Component 2: Category-based stacked bar chart
 */
export function TestCategoryChart() {
  const allValues = sampleCategoryData.flatMap(d => [d.support, d.hosting, d.forms]);
  const [, yMax] = calculateYAxisDomain(allValues, 1000);

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Test 2: Category Chart with CategoryTooltip</h3>
      <BaseBarChart
        data={sampleCategoryData}
        bars={[
          { dataKey: 'support', name: 'Support', fill: REVENUE_COLORS.tickets, stackId: 'category' },
          { dataKey: 'hosting', name: 'Hosting', fill: REVENUE_COLORS.hosting, stackId: 'category' },
          { dataKey: 'forms', name: 'Forms', fill: REVENUE_COLORS.projects, stackId: 'category' },
        ]}
        xAxisKey="month"
        yAxisConfig={{
          formatter: formatChartCurrency,
          domain: [0, yMax],
        }}
        customTooltip={(props) => (
          <CategoryTooltip
            {...props}
            categoryLabels={{
              support: 'Support Tickets',
              hosting: 'Hosting Services',
              forms: 'Form Projects',
            }}
          />
        )}
        height={400}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      />
    </div>
  );
}

/**
 * Test Component 3: Click handler test
 */
export function TestClickHandler() {
  const handleBarClick = (data: any, index: number) => {
    console.log('Bar clicked:', { data, index });
    alert(`Clicked: ${data.month} - Index: ${index}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Test 3: Click Handler</h3>
      <p className="text-sm text-muted-foreground">Click any bar to test interaction</p>
      <BaseBarChart
        data={sampleMonthlyData}
        bars={[
          { dataKey: 'medium', name: 'Medium Priority', fill: URGENCY_COLORS.medium },
        ]}
        xAxisKey="month"
        yAxisConfig={{
          formatter: formatChartCurrency,
        }}
        onBarClick={handleBarClick}
        height="compact"
      />
    </div>
  );
}

/**
 * Combined test page
 */
export function ChartInfrastructureTest() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Chart Infrastructure Test</h1>
          <p className="text-muted-foreground">
            Testing BaseBarChart, tooltips, and chart helpers
          </p>
        </div>

        <div className="space-y-8">
          <TestUrgencyChart />
          <TestCategoryChart />
          <TestClickHandler />
        </div>

        <div className="mt-8 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-semibold mb-2">Test Results Checklist:</h4>
          <ul className="space-y-1 text-sm">
            <li>✓ Charts render without errors</li>
            <li>✓ Tooltips display correctly on hover</li>
            <li>✓ Y-axis formatting shows currency</li>
            <li>✓ Colors match theme configuration</li>
            <li>✓ Click handlers work properly</li>
            <li>✓ Responsive container sizing works</li>
            <li>✓ Legend displays correctly</li>
            <li>✓ Dark mode support (toggle theme to test)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
