# React Dashboard for Request Analysis - Build Instructions

## Project Overview
Build a React dashboard using shadcn/ui components to visualize and analyze support request data from Thad Norman's messages. The dashboard will display tables, charts, and cost calculations.

## Tech Stack
- React 18 with TypeScript
- Vite (build tool)
- shadcn/ui (component library)
- Recharts (charting library)
- Tailwind CSS
- React Table (data tables)

## Project Setup

### Step 1: Initialize Project

```bash
# Create new Vite project
npm create vite@latest thad-request-dashboard -- --template react-ts
cd thad-request-dashboard

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install additional dependencies
npm install recharts lucide-react date-fns
npm install @tanstack/react-table
npm install class-variance-authority clsx tailwind-merge
```

### Step 2: Configure Tailwind CSS

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Step 3: Create Utility Files

Create `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Step 4: Create shadcn/ui Components

Create the following component files:

#### `src/components/ui/card.tsx`:
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

#### `src/components/ui/table.tsx`:
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("bg-primary font-medium text-primary-foreground", className)}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
```

### Step 5: Create Data Types

Create `src/types/request.ts`:
```typescript
export interface Request {
  Date: string;
  Time: string;
  Request_Summary: string;
  Urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  Category?: string;
  EstimatedHours?: number;
  Status?: 'Completed' | 'Pending';
}

export interface DailyRequestCount {
  date: string;
  count: number;
  high: number;
  medium: number;
  low: number;
}

export interface CategoryCount {
  name: string;
  value: number;
  percentage: number;
}

export interface CostCalculation {
  regularHours: number;
  sameDayHours: number;
  emergencyHours: number;
  regularCost: number;
  sameDayCost: number;
  emergencyCost: number;
  totalCost: number;
}
```

### Step 6: Create Data Processing Utilities

Create `src/utils/dataProcessing.ts`:
```typescript
import { Request, DailyRequestCount, CategoryCount, CostCalculation } from '@/types/request';
import { format, parseISO } from 'date-fns';

// Categorize requests based on keywords
export function categorizeRequest(summary: string): string {
  const lowerSummary = summary.toLowerCase();
  
  if (lowerSummary.includes('form') || lowerSummary.includes('webhook')) return 'Forms';
  if (lowerSummary.includes('dns') || lowerSummary.includes('nameserver')) return 'DNS';
  if (lowerSummary.includes('migration') || lowerSummary.includes('migrate')) return 'Migration';
  if (lowerSummary.includes('hosting') || lowerSummary.includes('server')) return 'Hosting';
  if (lowerSummary.includes('email')) return 'Email';
  if (lowerSummary.includes('backup') || lowerSummary.includes('zip')) return 'Backup';
  if (lowerSummary.includes('license')) return 'Licensing';
  if (lowerSummary.includes('page') || lowerSummary.includes('content')) return 'Content';
  if (lowerSummary.includes('tag') || lowerSummary.includes('analytics')) return 'Analytics';
  
  return 'General Support';
}

// Process requests for daily counts
export function processDailyRequests(requests: Request[]): DailyRequestCount[] {
  const dailyCounts = new Map<string, DailyRequestCount>();
  
  requests.forEach(request => {
    const date = request.Date;
    
    if (!dailyCounts.has(date)) {
      dailyCounts.set(date, {
        date,
        count: 0,
        high: 0,
        medium: 0,
        low: 0
      });
    }
    
    const dayData = dailyCounts.get(date)!;
    dayData.count++;
    
    switch (request.Urgency) {
      case 'HIGH':
        dayData.high++;
        break;
      case 'MEDIUM':
        dayData.medium++;
        break;
      case 'LOW':
        dayData.low++;
        break;
    }
  });
  
  return Array.from(dailyCounts.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// Process category counts for pie chart
export function processCategoryData(requests: Request[]): CategoryCount[] {
  const categoryCounts = new Map<string, number>();
  
  requests.forEach(request => {
    const category = request.Category || categorizeRequest(request.Request_Summary);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });
  
  const total = requests.length;
  
  return Array.from(categoryCounts.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100)
    }))
    .sort((a, b) => b.value - a.value);
}

// Calculate costs based on urgency and estimated hours
export function calculateCosts(requests: Request[]): CostCalculation {
  const HOURS_PER_REQUEST = 0.5;
  const RATES = {
    regular: 200,
    sameDay: 250,
    emergency: 300
  };
  
  let regularHours = 0;
  let sameDayHours = 0;
  let emergencyHours = 0;
  
  requests.forEach(request => {
    const hours = request.EstimatedHours || HOURS_PER_REQUEST;
    
    switch (request.Urgency) {
      case 'LOW':
        regularHours += hours;
        break;
      case 'MEDIUM':
        sameDayHours += hours;
        break;
      case 'HIGH':
        emergencyHours += hours;
        break;
    }
  });
  
  return {
    regularHours,
    sameDayHours,
    emergencyHours,
    regularCost: regularHours * RATES.regular,
    sameDayCost: sameDayHours * RATES.sameDay,
    emergencyCost: emergencyHours * RATES.emergency,
    totalCost: (regularHours * RATES.regular) + 
               (sameDayHours * RATES.sameDay) + 
               (emergencyHours * RATES.emergency)
  };
}
```

### Step 7: Create Chart Components

Create `src/components/RequestBarChart.tsx`:
```typescript
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyRequestCount } from '@/types/request';
import { format, parseISO } from 'date-fns';

interface RequestBarChartProps {
  data: DailyRequestCount[];
}

export function RequestBarChart({ data }: RequestBarChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(parseISO(item.date), 'MMM dd')
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Total Requests" />
        <Bar yAxisId="right" dataKey="high" stackId="priority" fill="#ef4444" name="High Priority" />
        <Bar yAxisId="right" dataKey="medium" stackId="priority" fill="#f59e0b" name="Medium Priority" />
        <Bar yAxisId="right" dataKey="low" stackId="priority" fill="#10b981" name="Low Priority" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

Create `src/components/CategoryPieChart.tsx`:
```typescript
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CategoryCount } from '@/types/request';

interface CategoryPieChartProps {
  data: CategoryCount[];
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#98d8c8', '#f7dc6f'
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} (${percentage}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### Step 8: Create Main Dashboard Component

Create `src/components/Dashboard.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RequestBarChart } from '@/components/RequestBarChart';
import { CategoryPieChart } from '@/components/CategoryPieChart';
import { Request, DailyRequestCount, CategoryCount, CostCalculation } from '@/types/request';
import { processDailyRequests, processCategoryData, calculateCosts, categorizeRequest } from '@/utils/dataProcessing';
import { DollarSign, Clock, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [dailyData, setDailyData] = useState<DailyRequestCount[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCount[]>([]);
  const [costs, setCosts] = useState<CostCalculation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data from CSV
    loadRequestData();
  }, []);

  const loadRequestData = async () => {
    try {
      // In production, this would fetch from an API or load the CSV
      // For now, we'll use sample data
      const response = await fetch('/thad_requests_table.csv');
      const text = await response.text();
      const parsedData = parseCSV(text);
      
      // Add categories to requests
      const enrichedData = parsedData.map(req => ({
        ...req,
        Category: categorizeRequest(req.Request_Summary)
      }));
      
      setRequests(enrichedData);
      setDailyData(processDailyRequests(enrichedData));
      setCategoryData(processCategoryData(enrichedData));
      setCosts(calculateCosts(enrichedData));
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      // Use sample data for development
      const sampleData: Request[] = [
        {
          Date: '2025-05-15',
          Time: '07:14 AM',
          Request_Summary: 'Up to 36 websites now and still counting that I\'ll need help migrating',
          Urgency: 'HIGH'
        },
        // Add more sample data as needed
      ];
      setRequests(sampleData);
      setDailyData(processDailyRequests(sampleData));
      setCategoryData(processCategoryData(sampleData));
      setCosts(calculateCosts(sampleData));
      setLoading(false);
    }
  };

  const parseCSV = (text: string): Request[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',');
      return {
        Date: values[0],
        Time: values[1],
        Request_Summary: values[2],
        Urgency: values[3] as 'HIGH' | 'MEDIUM' | 'LOW'
      };
    });
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[urgency as keyof typeof colors]}`}>
        {urgency}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Request Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          Analysis of support requests from Thad Norman ({requests.length} total requests)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {dailyData.length} days
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
              {costs ? (costs.regularHours + costs.sameDayHours + costs.emergencyHours).toFixed(1) : 0}
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
              ${costs?.totalCost.toLocaleString() || 0}
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
              {requests.filter(r => r.Urgency === 'HIGH').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((requests.filter(r => r.Urgency === 'HIGH').length / requests.length) * 100)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Requests Over Time</CardTitle>
            <CardDescription>Daily request volume with priority breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestBarChart data={dailyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Categories</CardTitle>
            <CardDescription>Distribution of request types</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      {costs && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Calculation</CardTitle>
            <CardDescription>Based on 0.5 hour increments and urgency-based pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Regular Support ($200/hr)</p>
                  <p className="text-2xl font-bold">{costs.regularHours} hours</p>
                  <p className="text-lg">${costs.regularCost.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Same Day ($250/hr)</p>
                  <p className="text-2xl font-bold">{costs.sameDayHours} hours</p>
                  <p className="text-lg">${costs.sameDayCost.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Emergency ($300/hr)</p>
                  <p className="text-2xl font-bold">{costs.emergencyHours} hours</p>
                  <p className="text-lg">${costs.emergencyCost.toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-2xl font-bold">${costs.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Complete list of support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Request Summary</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Urgency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.slice(0, 20).map((request, index) => (
                <TableRow key={index}>
                  <TableCell>{request.Date}</TableCell>
                  <TableCell>{request.Time}</TableCell>
                  <TableCell className="max-w-md truncate">{request.Request_Summary}</TableCell>
                  <TableCell>{request.Category || categorizeRequest(request.Request_Summary)}</TableCell>
                  <TableCell>{getUrgencyBadge(request.Urgency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {requests.length > 20 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing 20 of {requests.length} requests
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 9: Update App Component

Update `src/App.tsx`:
```typescript
import { Dashboard } from './components/Dashboard'

function App() {
  return <Dashboard />
}

export default App
```

### Step 10: Running the Application

1. **Place CSV file**: Put `thad_requests_table.csv` in the `public` folder

2. **Start the development server**:
```bash
npm run dev
```

3. **Build for production**:
```bash
npm run build
```

## Data Flow

1. **CSV Import**: The dashboard loads the CSV file generated by the Python script
2. **Data Processing**: 
   - Categorizes requests based on keywords
   - Calculates daily request counts
   - Determines cost based on urgency levels
3. **Visualization**:
   - Bar chart shows requests over time with urgency stacking
   - Pie chart displays category distribution
   - Table shows detailed request information
4. **Cost Calculation**:
   - LOW urgency = Regular support ($200/hr)
   - MEDIUM urgency = Same day support ($250/hr)
   - HIGH urgency = Emergency support ($300/hr)
   - Each request defaults to 0.5 hours

## Customization Options

### Adding More Categories
Update the `categorizeRequest` function in `dataProcessing.ts`:
```typescript
if (lowerSummary.includes('keyword')) return 'New Category';
```

### Adjusting Time Estimates
Modify the `HOURS_PER_REQUEST` constant or add logic to estimate based on request type

### Changing Pricing Tiers
Update the `RATES` object in the `calculateCosts` function

### Adding Filters
Implement state management for date ranges, categories, or urgency levels

## Production Considerations

1. **API Integration**: Replace CSV loading with API calls
2. **Authentication**: Add user authentication if needed
3. **Real-time Updates**: Implement WebSocket for live data
4. **Export Functionality**: Add buttons to export charts and data
5. **Mobile Responsiveness**: Test and optimize for mobile devices