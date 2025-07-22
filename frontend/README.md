# Thad Chat Request Analysis Dashboard - Frontend

A comprehensive React-based business intelligence dashboard for analyzing iMessage support requests, built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 Dashboard Features

### Data Management
- **Status-Based Row Management**: Uses `active`, `deleted`, `ignored` status fields instead of permanent deletion
- **Bulk Operations**: Select multiple requests for batch delete, category change, or urgency modification  
- **In-Line Editing**: Click Category or Urgency cells to modify individual values
- **Soft Delete System**: Move requests to recoverable "deleted" status with one-click restore
- **Auto-Save**: Changes automatically persist to data directory with timestamped backups

### Analytics & Visualization
- **Interactive Charts**: Request counts by priority level with Recharts
- **Category Distribution**: Pie chart showing request type breakdown
- **Time-Based Filtering**: Filter by year, month, or day with automatic view switching
- **Cost Calculation**: Automatic pricing based on urgency tiers ($200-$300/hour)
- **Real-Time KPIs**: Summary cards with total requests, hours, costs, and high-priority counts

### Navigation & Filtering
- **Multi-Level Filtering**: Year → Month → Day selection with smart defaults
- **View Mode Toggle**: All/Month/Day buttons control chart granularity
- **Table Sorting**: Click column headers to sort by any field
- **Pagination**: Configurable page sizes (20, 50, 100, All)
- **Search & Filter**: Advanced filtering options with persistent state

## 🗂️ Data Flow Architecture

The dashboard connects to a structured ETL pipeline:

```
Raw iMessage CSV → Data Preprocessor → Request Extractor → Frontend Dashboard
     (Stage 1)         (Stage 2)         (Stage 3)         (Stage 4)
```

### Data Sources
- **Primary**: `/public/thad_requests_table.csv` - Main dataset with all requests
- **Status Field**: Each request has `status: 'active' | 'deleted' | 'ignored'`
- **Persistence**: Changes saved to `data/03_final/` directory with versioning

## 🏗️ Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with fast refresh
- **Styling**: Tailwind CSS with custom shadcn/ui components  
- **Charts**: Recharts for interactive data visualization
- **State**: React hooks with localStorage backup

### Key Components
- `Dashboard.tsx` - Main dashboard with all features
- `RequestBarChart.tsx` - Time-series chart with priority levels
- `CategoryPieChart.tsx` - Distribution visualization
- `EditableCell.tsx` - In-line editing component
- `Pagination.tsx` - Table navigation controls

### Data Types
```typescript
interface ChatRequest {
  Date: string;
  Time: string;
  Request_Summary: string;
  Urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  Category?: string;
  EstimatedHours?: number;
  Status?: 'active' | 'deleted' | 'ignored';  // New status-based system
}
```

## 📁 File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          # Main dashboard component
│   │   ├── RequestBarChart.tsx    # Time-series visualization
│   │   ├── CategoryPieChart.tsx   # Category distribution
│   │   ├── EditableCell.tsx       # In-line editing
│   │   ├── Pagination.tsx         # Table navigation
│   │   └── ui/                    # Reusable UI components
│   ├── utils/
│   │   ├── dataProcessing.ts      # Data transformation logic
│   │   ├── csvExport.ts           # Save/export functionality
│   │   └── timeUtils.ts           # Date/time utilities
│   ├── types/
│   │   └── request.ts             # TypeScript interfaces
│   └── assets/                    # Static assets
├── public/
│   └── thad_requests_table.csv    # Primary data source
└── dist/                          # Production build output
```

## 💾 Data Persistence Strategy

### Status-Based Management
- **No Permanent Deletion**: Requests marked as `deleted` or `ignored` instead of removed
- **Single Dataset**: All requests stay in one array with different status values
- **Calculations**: Only `active` requests included in charts and KPIs
- **Recovery**: One-click restore from deleted status

### File Persistence
- **Main Table**: `data/03_final/thad_requests_table.csv` - Active requests
- **Deleted Requests**: `data/03_final/deleted_requests.csv` - Recoverable deleted data  
- **Timestamped Backups**: `data/03_final/backups/thad_requests_backup_YYYY-MM-DDTHH-mm-ss.csv`
- **Original Backup**: `thad_original_backup.csv` - Untouched source data

### Export Format
CSV files include all original columns plus new `status` column:
```csv
date,time,month,request_type,category,description,urgency,effort,status
2025-07-15,09:30 AM,2025-07,General Request,Support,"Website migration help",MEDIUM,Medium,active
```

## 🎯 User Workflows

### Daily Operations
1. **Review Dashboard**: Check summary cards and charts for current status
2. **Filter Data**: Use year/month/day selectors to focus on specific periods  
3. **Edit Requests**: Click cells to modify categories or urgency levels
4. **Bulk Actions**: Select multiple requests for batch operations
5. **Save Changes**: Use save button to persist modifications

### Request Management
1. **Delete Requests**: Click trash icon to move to deleted status (recoverable)
2. **Bulk Delete**: Select multiple requests and use bulk delete action
3. **Restore Deleted**: View deleted requests section and click restore icon
4. **Clear Deleted**: Permanently remove deleted requests from dataset

### Data Analysis
1. **Time Views**: Toggle between All/Month/Day views for different granularity
2. **Category Analysis**: Review pie chart for request distribution
3. **Cost Tracking**: Monitor total hours and costs by urgency tier
4. **Priority Management**: Track high-priority requests with dedicated KPI

## 🔧 Configuration

### Environment Variables
- Development server runs on `http://localhost:5173` (or next available port)
- Production build outputs to `dist/` directory
- CSV data loaded from `/public/thad_requests_table.csv`

### Customization Options
- **Page Sizes**: Modify pagination options in `Dashboard.tsx`
- **Cost Rates**: Update pricing tiers in `dataProcessing.ts`
- **Categories**: Add new request categories in component state
- **Urgency Levels**: Extend urgency options as needed

## 🚨 Troubleshooting

### Common Issues
1. **Data Not Loading**: Verify CSV exists at `/public/thad_requests_table.csv`
2. **Build Errors**: Run `npm run build` to check TypeScript issues
3. **Port Conflicts**: Dev server automatically finds available port
4. **Memory Issues**: Large datasets may require pagination adjustments

### Performance Notes
- Handles ~1000 requests efficiently
- Chart rendering optimized for selected date ranges
- Pagination prevents UI lag with large datasets
- Bulk operations process in batches

## 📈 Future Enhancements

### Planned Features
- **Real-Time Data**: Live updates from message sources
- **Advanced Analytics**: Trend analysis and seasonal patterns
- **Export Options**: PDF reports and custom date ranges
- **Mobile Support**: Responsive design improvements
- **API Integration**: Connect to external project management tools

### Development Priorities
1. **Performance**: Optimize for larger datasets (>2000 requests)
2. **UX**: Enhanced filtering and search capabilities  
3. **Analytics**: More sophisticated business intelligence features
4. **Integration**: Connect to broader business workflow tools

## 📝 Development Notes

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: React and TypeScript rules configured
- **Components**: Functional components with hooks
- **State**: Local state with localStorage persistence

### Testing Strategy
- **Manual Testing**: Verify all features work after changes
- **Build Verification**: `npm run build` must pass without errors
- **Console Monitoring**: Check for runtime errors and warnings
- **Cross-Browser**: Test in major browsers for compatibility

This dashboard provides a complete solution for transforming conversational support data into actionable business intelligence with enterprise-grade features and user experience.