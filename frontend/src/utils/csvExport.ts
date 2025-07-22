import type { ChatRequest } from '../types/request';

// Get the data directory path relative to the frontend (currently unused)
// const getDataPath = () => {
//   // From frontend/ to project root, then to data/03_final/
//   return '../../data/03_final';
// };

// Create timestamped filename
const createTimestampedFilename = (baseName: string, extension: string = 'csv') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-mm-ss
  const nameWithoutExt = baseName.replace(/\.[^/.]+$/, ''); // Remove existing extension
  return `${nameWithoutExt}_${timestamp}.${extension}`;
};

export function exportToCSV(requests: ChatRequest[], filename: string = 'thad_requests_updated.csv') {
  // Convert requests to CSV format matching the original structure
  const headers = ['date', 'time', 'month', 'request_type', 'category', 'description', 'urgency', 'effort'];
  
  const csvData = requests.map(request => {
    const date = request.Date;
    const month = date.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
    
    return [
      date,
      request.Time,
      month,
      'General Request', // Default request type
      request.Category || 'Support',
      `"${request.Request_Summary?.replace(/"/g, '""') || ''}"`, // Escape quotes in CSV
      request.Urgency,
      request.EstimatedHours === 0.25 ? 'Small' : 
      request.EstimatedHours === 1.0 ? 'Large' : 'Medium'
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...csvData].join('\n');
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Save files with versioning system: preserves original, creates working version
export async function saveToDataDirectory(billableRequests: ChatRequest[], nonBillableRequests: ChatRequest[] = []) {
  // Combine all requests for complete dataset
  const allRequests = [...billableRequests, ...nonBillableRequests];
  
  try {
    // IMPORTANT: Never overwrite the original data file
    // Instead, create/update a working version that will be loaded next time
    
    // 1. Save working version to public directory (this will be loaded next time)
    await saveCSVToPublic(allRequests, 'thad_requests_working.csv');
    
    // 2. Create timestamped backup for version history
    const backupFilename = createTimestampedFilename('thad_requests_version');
    await downloadCSV(allRequests, backupFilename);
    
    // 3. Save non-billable requests separately for reference (in public)
    if (nonBillableRequests.length > 0) {
      await saveCSVToPublic(nonBillableRequests, 'thad_non_billable_working.csv');
    }
    
    console.log('Successfully created working version - this will be used on next refresh');
    console.log('Original data preserved as thad_requests_table.csv');
    
  } catch (error) {
    console.error('Error saving working version:', error);
    // Fallback to download method
    console.log('Falling back to download method...');
    const timestampedFilename = createTimestampedFilename('thad_requests_download');
    downloadCSV(allRequests, timestampedFilename);
  }
}

// Helper function to save CSV content to a file path (currently unused in new versioning system)
/*
async function saveCSVToFile(requests: ChatRequest[], filePath: string) {
  const headers = ['date', 'time', 'month', 'request_type', 'category', 'description', 'urgency', 'effort'];
  
  const csvData = requests.map(request => {
    const date = request.Date;
    const month = date.substring(0, 7);
    
    return [
      date,
      request.Time,
      month,
      'General Request',
      request.Category || 'Support',
      `"${request.Request_Summary?.replace(/"/g, '""') || ''}"`,
      request.Urgency,
      request.EstimatedHours === 0.25 ? 'Small' : 
      request.EstimatedHours === 1.0 ? 'Large' : 'Medium'
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...csvData].join('\n');
  
  // For browser environment, we'll use the File System Access API if available
  // Otherwise fall back to download
  if ('showSaveFilePicker' in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filePath.split('/').pop(),
        types: [{
          description: 'CSV files',
          accept: { 'text/csv': ['.csv'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
    } catch (error) {
      // User cancelled or API not available
      throw error;
    }
  } else {
    // Fallback: create download with suggested path in filename
    const filename = filePath.replace(/.*\//, ''); // Get just the filename
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}
*/

// Helper function to save CSV to public directory (will be accessible to the app)
async function saveCSVToPublic(requests: ChatRequest[], filename: string) {
  const headers = ['date', 'time', 'month', 'request_type', 'category', 'description', 'urgency', 'effort'];
  
  const csvData = requests.map(request => {
    const date = request.Date;
    const month = date.substring(0, 7);
    
    return [
      date,
      request.Time,
      month,
      'General Request',
      request.Category || 'Support',
      `"${request.Request_Summary?.replace(/"/g, '""') || ''}"`,
      request.Urgency,
      request.EstimatedHours === 0.25 ? 'Small' : 
      request.EstimatedHours === 1.0 ? 'Large' : 'Medium'
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...csvData].join('\n');
  
  // Try to save to public directory using File System Access API
  try {
    if ('showSaveFilePicker' in window) {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        startIn: 'downloads',
        types: [{
          description: 'CSV files',
          accept: { 'text/csv': ['.csv'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      console.log(`Saved working version: ${filename}`);
    } else {
      // Fallback: download the file (user will need to move it to public directory)
      await downloadCSV(requests, filename);
      console.log(`Downloaded working version: ${filename} - please move to public directory`);
    }
  } catch (error) {
    // User cancelled or API failed, fallback to download
    await downloadCSV(requests, filename);
    console.log(`Downloaded working version: ${filename} - please move to public directory`);
  }
}

// Helper function to download CSV file
async function downloadCSV(requests: ChatRequest[], filename: string) {
  const headers = ['date', 'time', 'month', 'request_type', 'category', 'description', 'urgency', 'effort'];
  
  const csvData = requests.map(request => {
    const date = request.Date;
    const month = date.substring(0, 7);
    
    return [
      date,
      request.Time,
      month,
      'General Request',
      request.Category || 'Support',
      `"${request.Request_Summary?.replace(/"/g, '""') || ''}"`,
      request.Urgency,
      request.EstimatedHours === 0.25 ? 'Small' : 
      request.EstimatedHours === 1.0 ? 'Large' : 'Medium'
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...csvData].join('\n');
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Function to reset to original dataset (removes working version)
export async function resetToOriginal() {
  try {
    // Try to delete the working version file using File System Access API
    if ('showSaveFilePicker' in window) {
      // Unfortunately, we can't directly delete files from the public directory
      // The user will need to manually delete thad_requests_working.csv
      console.log('To reset to original data: delete thad_requests_working.csv from the public directory');
      return { 
        success: false, 
        message: 'Please manually delete thad_requests_working.csv from the public directory to reset to original data'
      };
    }
    
    return { 
      success: false, 
      message: 'Manual reset required: delete thad_requests_working.csv from public directory'
    };
  } catch (error) {
    console.error('Error during reset:', error);
    return { 
      success: false, 
      message: 'Reset failed - please manually delete thad_requests_working.csv'
    };
  }
}

// Keep the original export function for backward compatibility
export function saveRequestChanges(requests: ChatRequest[], deletedRequests: ChatRequest[] = []) {
  // Export current billable requests
  exportToCSV(requests, 'thad_billable_requests.csv');
  
  // Export deleted requests if any exist
  if (deletedRequests.length > 0) {
    exportToCSV(deletedRequests, 'thad_deleted_requests.csv');
  }
  
  // Save original data as backup (if available)
  const originalData = localStorage.getItem('originalRequestsBackup');
  if (originalData) {
    try {
      const originalRequests: ChatRequest[] = JSON.parse(originalData);
      exportToCSV(originalRequests, 'thad_original_backup.csv');
    } catch (error) {
      console.warn('Could not export original backup:', error);
    }
  }
}