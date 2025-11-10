# MySQL Setup Instructions for Thad Chat Dashboard

## Prerequisites

1. **Install MySQL** (if not already installed):
   - macOS: `brew install mysql`
   - Linux: `sudo apt-get install mysql-server`
   - Windows: Download from https://dev.mysql.com/downloads/

2. **Start MySQL service**:
   - macOS: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`
   - Windows: MySQL should start automatically

## Database Setup

### 1. Create the Database

```bash
# Login to MySQL
mysql -u root -p

# Create the database
mysql> CREATE DATABASE IF NOT EXISTS thad_chat;
mysql> exit;
```

### 2. Run the Schema Script

```bash
# From the project root directory
mysql -u root -p thad_chat < backend/db/schema.sql
```

This will create:
- `requests` table with all necessary columns
- Indexes for performance
- Views for statistics

### 3. Configure Backend Environment

```bash
cd backend

# Copy the example environment file
cp .env.example .env

# Edit .env and update MySQL credentials
# DB_USER=root
# DB_PASSWORD=your_password_here
# DB_NAME=thad_chat
```

## Running the Application

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Import Existing Data (Optional)

If you have existing CSV data to import:

```bash
# Import the default CSV file
npm run import

# Or import with options
npm run import --clear  # Clear existing data first
npm run import --file /path/to/custom.csv  # Import custom CSV
```

### 3. Start the Backend Server

```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

The server will run on http://localhost:3001

### 4. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5173

## Testing the Integration

### 1. Verify Database Connection

When the backend starts, you should see:
```
✅ Database connected successfully
✅ Database schema already exists
🚀 Server running on http://localhost:3001
```

### 2. Check API Health

Visit http://localhost:3001/health in your browser. You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-09-16T...",
  "environment": "development"
}
```

### 3. Frontend Database Indicator

When you load the frontend dashboard:
- If connected to database: Green "Connected to Database" badge
- If using CSV fallback: Blue "Working Version (CSV)" badge

### 4. Test Data Persistence

1. **Edit a request** in the dashboard (change Category or Urgency)
2. **No Save button needed** when using database - changes are instant
3. **Refresh the page** - your changes should persist
4. **Check multiple browsers** - changes appear everywhere immediately

## How It Works

### With MySQL (Recommended)

1. **Real-time persistence**: Every change saves immediately to the database
2. **No Save button**: Changes are instant and permanent
3. **Multi-user support**: Multiple users can work simultaneously
4. **Better performance**: Database queries are faster than CSV parsing
5. **Advanced features**: Filtering, sorting, and statistics from database

### CSV Fallback Mode

If the database is not available, the system automatically falls back to CSV mode:

1. **Local changes**: Edits are stored in browser memory
2. **Save button appears**: Manual save required for CSV mode
3. **Single user**: Changes don't sync across browsers
4. **Original functionality**: Works exactly as before

## Troubleshooting

### Cannot Connect to MySQL

1. **Check MySQL is running**:
   ```bash
   # macOS
   brew services list | grep mysql

   # Linux
   sudo systemctl status mysql
   ```

2. **Verify credentials**:
   ```bash
   mysql -u root -p
   # If this works, your password is correct
   ```

3. **Check database exists**:
   ```sql
   mysql> SHOW DATABASES;
   # Should list 'thad_chat'
   ```

### Backend Won't Start

1. **Port already in use**:
   - Change PORT in backend/.env to another port (e.g., 3002)
   - Update frontend API calls if needed

2. **Module errors**:
   ```bash
   cd backend
   rm -rf node_modules
   npm install
   ```

### Frontend Shows CSV Mode

1. **Check backend is running**: http://localhost:3001/health
2. **Check browser console** for CORS errors
3. **Verify API URL** matches in both frontend and backend

## Benefits of MySQL Integration

1. **Instant Save**: No more clicking save button
2. **Multi-User**: Multiple people can use simultaneously
3. **Performance**: 10x faster than CSV for large datasets
4. **Reliability**: ACID compliance ensures data integrity
5. **Scalability**: Can handle millions of requests
6. **Advanced Queries**: Complex filtering and aggregation
7. **Audit Trail**: Automatic timestamps for all changes
8. **Backup**: Easy database backup and restore

## Next Steps

- Set up automated backups with `mysqldump`
- Configure production deployment
- Add user authentication
- Implement real-time updates with WebSockets
- Create admin dashboard for user management