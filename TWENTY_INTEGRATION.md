# Twenty API Integration Documentation

## Overview
The Thad Chat dashboard has been integrated with the Twenty CRM API to fetch and display support tickets alongside SMS requests. This creates a unified view of all support requests across different channels.

## Files Created/Modified

### New Files
1. **`frontend/src/services/twentyApi.ts`**
   - Main service for interacting with Twenty API
   - Functions: `fetchSupportTickets()`, `createSupportTicket()`, `fetchAndTransformTickets()`
   - Includes mock data function for testing: `getMockTickets()`

2. **`frontend/src/utils/ticketTransform.ts`** (Already existed)
   - Transforms Twenty API tickets to ChatRequest format
   - Maps priority levels: CRITICAL→HIGH, MEDIUM→MEDIUM, NORMAL→LOW
   - Maps categories: BRAND_WEBSITE_TICKET→Support, LANDING_PAGE_TICKET→Forms
   - Estimates hours based on urgency

3. **`frontend/.env` and `frontend/.env.example`**
   - Configuration for Twenty API connection
   - Environment variables:
     - `VITE_TWENTY_API_URL`: Twenty API endpoint (default: http://localhost:3000)
     - `VITE_TWENTY_API_TOKEN`: Authentication token (optional)
     - `VITE_TWENTY_USE_MOCK`: Use mock data for testing (default: true)

### Modified Files
1. **`frontend/src/components/Dashboard.tsx`**
   - Added Twenty API service import
   - Modified `loadData()` to fetch tickets from Twenty API
   - Merges SMS and ticket requests into single dataset
   - Already had source field display with icons (🎫 for tickets)

2. **`frontend/src/utils/api.ts`**
   - Added source field support in `transformDbRow()`
   - Defaults to 'sms' for backward compatibility

3. **`docker-compose.yml`**
   - Added Twenty API environment variables to frontend service
   - Passes through configuration from host environment

## How It Works

### Data Flow
1. **Dashboard Load**: When the dashboard loads, it calls `loadData()`
2. **Fetch SMS Data**: First fetches existing SMS requests from the backend API
3. **Fetch Ticket Data**: Then fetches tickets from Twenty API (or uses mock data)
4. **Transform Tickets**: Tickets are transformed to match ChatRequest format
5. **Merge Data**: Both datasets are merged into a single array
6. **Display**: Dashboard displays all requests with appropriate source icons

### Source Indicators
- 💬 **Text** (SMS): Blue message circle icon
- 🎫 **Ticket**: Green ticket icon
- 📧 **Email**: Purple mail icon (future)
- 📞 **Phone**: Orange phone icon (future)

### Mock Data Mode
When `VITE_TWENTY_USE_MOCK=true`, the system uses 3 sample tickets for testing:
1. Critical priority website issue
2. Medium priority form submission issue
3. Normal priority server performance issue

## Configuration

### Development Mode (Mock Data)
```bash
# In frontend/.env
VITE_TWENTY_USE_MOCK=true
```

### Production Mode (Real API)
```bash
# In frontend/.env
VITE_TWENTY_API_URL=http://your-twenty-instance.com
VITE_TWENTY_API_TOKEN=your-api-token-here
VITE_TWENTY_USE_MOCK=false
```

### Docker Compose
The environment variables are passed through docker-compose.yml:
```yaml
environment:
  VITE_TWENTY_API_URL: ${VITE_TWENTY_API_URL:-http://localhost:3000}
  VITE_TWENTY_API_TOKEN: ${VITE_TWENTY_API_TOKEN:-}
  VITE_TWENTY_USE_MOCK: ${VITE_TWENTY_USE_MOCK:-true}
```

## Running the Integration

### With Docker Compose (Recommended)
```bash
# Restart frontend container with new configuration
docker-compose restart frontend

# View logs
docker logs thad-chat-frontend -f
```

### Local Development
```bash
cd frontend
npm run dev
```

## Testing the Integration

1. **Check Browser Console**: Open developer tools and look for:
   - "Using mock Twenty API data..." (when in mock mode)
   - "Fetched 3 tickets from Twenty API"
   - Sample ticket request details

2. **Verify Display**:
   - Check that tickets appear in the table with 🎫 icon
   - Verify source filter includes "Ticket" option
   - Confirm Total Requests scorecard shows ticket count

3. **Test Transformations**:
   - CRITICAL priority → HIGH urgency (red)
   - MEDIUM priority → MEDIUM urgency (yellow)
   - NORMAL priority → LOW urgency (green)
   - Categories mapped correctly

## API Endpoints

### Twenty API
- **GET** `/rest/supportTicket?depth=1` - Fetch all support tickets
- **POST** `/rest/supportTicket` - Create new support ticket

### Ticket Structure
Based on Twenty API documentation (20.md):
```typescript
interface SupportTicket {
  fsCreationDate: string;      // Date of ticket creation
  subject: string;              // Ticket subject/title
  description?: string;         // Detailed description
  priority: 'NORMAL' | 'MEDIUM' | 'CRITICAL';
  category: 'BRAND_WEBSITE_TICKET' | 'MULTI_BRAND_TICKET' | 'LANDING_PAGE_TICKET';
  integrationProvider: 'FLUENT' | 'JIRA';
  // ... additional fields
}
```

## Future Enhancements

1. **Real-time Updates**: Implement webhook support for live ticket updates
2. **Two-way Sync**: Allow updating ticket status from the dashboard
3. **Additional Sources**: Add email and phone request support
4. **Filtering**: Add date range filters for ticket fetching
5. **Error Handling**: Implement retry logic and better error messages
6. **Caching**: Add caching layer to reduce API calls

## Troubleshooting

### Tickets Not Showing
1. Check browser console for errors
2. Verify `VITE_TWENTY_USE_MOCK=true` in .env file
3. Restart frontend container: `docker-compose restart frontend`
4. Check docker logs: `docker logs thad-chat-frontend`

### API Connection Issues
1. Verify Twenty API URL is correct
2. Check authentication token if required
3. Ensure Twenty API is accessible from frontend container
4. Test with mock data first: `VITE_TWENTY_USE_MOCK=true`

### TypeScript Errors
The integration includes type-safe transformations. If you encounter type errors:
1. Run `npm run build` to check for compilation issues
2. Verify all imports are correct
3. Check that source field is included in ChatRequest type