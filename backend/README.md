# Thad Chat Backend Server

Backend API server for the Thad Chat Request Analysis Dashboard using Express.js and MySQL.

## Prerequisites

- Node.js 16+
- MySQL 5.7+ or 8.0+
- npm or yarn

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up MySQL database:
```bash
# Login to MySQL
mysql -u root -p

# Create database and tables
mysql> source db/schema.sql
```

3. Configure environment:
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your MySQL credentials
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=velocity_billing
```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will run on http://localhost:3001 by default.

## Importing Existing Data

Import your existing CSV data into MySQL:

```bash
# Import default CSV file
npm run import

# Clear existing data and import
npm run import --clear

# Import custom CSV file
npm run import --file /path/to/custom.csv

# View help
npm run import --help
```

## API Endpoints

### Requests

- `GET /api/requests` - Get all requests (with optional filters)
- `GET /api/requests/:id` - Get single request
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request (soft or permanent)
- `POST /api/requests/bulk-update` - Bulk update multiple requests

### Statistics

- `GET /api/statistics` - Get request statistics

### Import/Export

- `POST /api/import-csv` - Import CSV data
- `GET /api/export-csv` - Export data as CSV
- `POST /api/save-csv` - Legacy endpoint for frontend compatibility

### Health Check

- `GET /health` - Server health check

## Query Parameters

### GET /api/requests

- `status` - Filter by status (active, deleted, ignored, all)
- `category` - Filter by category
- `urgency` - Filter by urgency (LOW, MEDIUM, HIGH)
- `startDate` - Filter by start date (YYYY-MM-DD)
- `endDate` - Filter by end date (YYYY-MM-DD)

Example:
```
GET /api/requests?status=active&category=Support&urgency=HIGH
```

## Database Schema

The main `requests` table contains:

- `id` - Primary key
- `date` - Request date
- `time` - Request time
- `month` - Month (auto-generated)
- `request_type` - Type of request
- `category` - Category (Support, Hosting, etc.)
- `description` - Request description
- `urgency` - LOW, MEDIUM, HIGH
- `effort` - Small, Medium, Large
- `status` - active, deleted, ignored
- `estimated_hours` - Auto-calculated based on effort
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Environment Variables

- `DB_HOST` - MySQL host (default: localhost)
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name (default: velocity_billing)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## Development

The server uses ES modules and includes:

- Express.js for the web framework
- MySQL2 for database connections
- CORS for cross-origin requests
- Dotenv for environment variables
- Nodemon for development auto-restart

## Troubleshooting

### Cannot connect to MySQL

1. Make sure MySQL is running:
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

2. Check MySQL credentials in `.env` file

3. Ensure database exists:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS velocity_billing;"
```

### Port already in use

Change the PORT in `.env` file to a different port number.

### CORS errors

Make sure FRONTEND_URL in `.env` matches your frontend URL.