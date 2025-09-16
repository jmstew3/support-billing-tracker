const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/csv', limit: '10mb' }));

// Path to data directory (relative to the project root)
const DATA_DIR = path.resolve(__dirname, '../data/03_final');
const BACKUP_DIR = path.resolve(__dirname, '../data/03_final/backups');

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('Data directories ensured');
  } catch (error) {
    console.error('Error creating directories:', error);
  }
};

// Helper function to create timestamped filename
const createTimestampedFilename = (baseName, extension = 'csv') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-mm-ss
  const nameWithoutExt = baseName.replace(/\.[^/.]+$/, ''); // Remove existing extension
  return `${nameWithoutExt}_${timestamp}.${extension}`;
};

// API endpoint to save CSV data
app.post('/api/save-csv', async (req, res) => {
  try {
    const { csvContent, filename, createBackup = true } = req.body;
    
    if (!csvContent || !filename) {
      return res.status(400).json({ error: 'CSV content and filename are required' });
    }
    
    // Save the main working file
    const mainFilePath = path.join(DATA_DIR, filename);
    await fs.writeFile(mainFilePath, csvContent, 'utf8');
    console.log(`Saved: ${mainFilePath}`);
    
    // Create timestamped backup if requested
    let backupFilename = null;
    if (createBackup) {
      backupFilename = createTimestampedFilename(filename);
      const backupFilePath = path.join(BACKUP_DIR, backupFilename);
      await fs.writeFile(backupFilePath, csvContent, 'utf8');
      console.log(`Backup created: ${backupFilePath}`);
    }
    
    res.json({ 
      success: true, 
      filename,
      backupFilename,
      timestamp: new Date().toISOString(),
      message: 'File saved successfully'
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// API endpoint to load CSV data
app.get('/api/load-csv/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(DATA_DIR, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read and return file content
    const csvContent = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    res.send(csvContent);
  } catch (error) {
    console.error('Error loading file:', error);
    res.status(500).json({ error: 'Failed to load file' });
  }
});

// API endpoint to list available CSV files
app.get('/api/list-csv', async (req, res) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    const fileDetails = await Promise.all(
      csvFiles.map(async (filename) => {
        const filePath = path.join(DATA_DIR, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
    );
    
    // Sort by modification time (newest first)
    fileDetails.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    
    res.json(fileDetails);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Start server
const startServer = async () => {
  await ensureDirectories();
  app.listen(PORT, () => {
    console.log(`Data API server running at http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Backup directory: ${BACKUP_DIR}`);
  });
};

startServer();