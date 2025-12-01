# Development Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd support-billing-tracker
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.docker.example .env.docker

# Edit with your values
nano .env.docker
```

### 3. Start with Docker Compose

```bash
docker-compose --env-file .env.docker up -d
```

### 4. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3011/api
- **Health Check**: http://localhost:3011/api/health

## Development Workflows

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Frontend tests (if configured)
cd frontend && npm test

# Full integration test
docker-compose --env-file .env.docker up -d
curl http://localhost:3011/api/health
```

## Code Organization

### Feature-Based Structure (Frontend)

```
frontend/src/features/support/
├── components/
│   ├── SupportTickets.tsx     # Main page component
│   ├── sections/              # Sub-components
│   └── hooks/                 # Feature-specific hooks
├── services/                  # API calls
└── types/                     # TypeScript types
```

### Adding a New Feature

1. Create feature folder: `frontend/src/features/<feature-name>/`
2. Create components in `components/`
3. Create hooks in feature `hooks/` or use shared hooks
4. Add route in `App.tsx`
5. Add navigation in `Sidebar.tsx`

### Repository Pattern (Backend)

```javascript
// Create new repository
// backend/repositories/MyRepository.js

import pool from '../db/config.js';

class MyRepository {
  async findAll() {
    const [rows] = await pool.execute('SELECT * FROM my_table');
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM my_table WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async create(data, connection = null) {
    const conn = connection || pool;
    const [result] = await conn.execute(
      'INSERT INTO my_table (field1, field2) VALUES (?, ?)',
      [data.field1, data.field2]
    );
    return result.insertId;
  }
}

export default new MyRepository();
```

### Service Layer (Backend)

```javascript
// Create new service
// backend/services/MyService.js

import pool from '../db/config.js';
import MyRepository from '../repositories/MyRepository.js';

class MyService {
  async processData(input) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Business logic here
      const result = await MyRepository.create(input, connection);

      await connection.commit();
      return { success: true, id: result };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default new MyService();
```

## React Query Hooks

### Using Existing Hooks

```typescript
import { useRequests, useUpdateRequest } from '@/hooks';

function MyComponent() {
  // Fetch data
  const { data: requests, isLoading, error } = useRequests({
    status: 'active',
    category: 'Support'
  });

  // Mutations
  const updateRequest = useUpdateRequest();

  const handleUpdate = (id: number, data: object) => {
    updateRequest.mutate({ id, data });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (/* render data */);
}
```

### Creating New Hooks

```typescript
// frontend/src/hooks/useMyFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

export function useMyData(filters: MyFilters) {
  return useQuery({
    queryKey: ['myFeature', 'list', filters],
    queryFn: () => fetchMyData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateMyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateMyData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFeature'] });
    },
  });
}
```

## Database Migrations

### Creating a Migration

```bash
# Create migration file
touch backend/db/migrations/006_my_migration.sql
```

```sql
-- backend/db/migrations/006_my_migration.sql

-- Add new column
ALTER TABLE requests ADD COLUMN new_field VARCHAR(100);

-- Create index
CREATE INDEX idx_requests_new_field ON requests(new_field);

-- Rollback (comment to preserve)
-- ALTER TABLE requests DROP COLUMN new_field;
-- DROP INDEX idx_requests_new_field ON requests;
```

### Running Migrations

```bash
# Connect to MySQL container
docker exec -it support-billing-tracker-mysql mysql -u root -p

# Run migration
USE support_billing_tracker;
SOURCE /path/to/006_my_migration.sql;
```

## Testing

### Backend Unit Tests

```javascript
// backend/routes/__tests__/myRoute.test.js
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('My Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle request correctly', async () => {
    // Test implementation
  });
});
```

### Running Specific Tests

```bash
# Run single test file
npm test -- routes/__tests__/myRoute.test.js

# Run tests matching pattern
npm test -- --testPathPattern=myRoute

# Watch mode
npm test -- --watch
```

## Docker Commands

```bash
# Start all services
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart single service
docker-compose restart backend

# Rebuild without cache
docker-compose build --no-cache frontend

# Stop and remove
docker-compose down

# Stop and remove with volumes (CAUTION: deletes data)
docker-compose down -v
```

## Environment Variables

### Frontend (.env or via Docker)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3011/api` |
| `VITE_TWENTY_API_URL` | Twenty CRM API | `https://twenty.example.com/rest` |
| `VITE_TWENTY_API_TOKEN` | Twenty API token | `Bearer xxx` |

### Backend (.env.docker)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3011` |
| `MYSQL_HOST` | Database host | `mysql` |
| `MYSQL_USER` | Database user | `thaduser` |
| `MYSQL_PASSWORD` | Database password | `thadpassword` |
| `MYSQL_DATABASE` | Database name | `support_billing_tracker` |
| `JWT_SECRET` | JWT signing key | `your-secret-key` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |

## Common Issues

### CORS Errors

1. Check `FRONTEND_URL` in backend environment
2. Verify frontend `VITE_API_URL` matches backend port
3. Restart backend after env changes

### Database Connection

1. Ensure MySQL container is running: `docker-compose ps`
2. Check credentials in `.env.docker`
3. Verify network connectivity: `docker network ls`

### Cache Issues

```bash
# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Clear React Query cache (in browser)
# DevTools → Application → Local Storage → Clear
```

### JWT Token Issues

1. Clear browser localStorage
2. Re-login to get fresh token
3. Check `JWT_SECRET` consistency across restarts

## Performance Tips

1. Use React Query hooks instead of direct API calls
2. Implement pagination for large datasets
3. Use database indexes for frequently filtered columns
4. Enable gzip compression in production
5. Use production builds (`npm run build`)
