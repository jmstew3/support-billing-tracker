// Convert UTC time to Eastern Time
export function convertToEasternTime(date: string, time: string): string {
  try {
    // Combine date and time into a full datetime string
    const utcDateTime = `${date}T${time}Z`;
    const utcDate = new Date(utcDateTime);
    
    // Convert to Eastern Time
    const easternTime = utcDate.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return easternTime;
  } catch (error) {
    // If conversion fails, return original time
    console.warn('Time conversion failed:', error);
    return time;
  }
}

// Format time assuming it's already in Eastern Time (for backward compatibility)
export function formatTime(time: string): string {
  try {
    // Parse the time (assuming format HH:mm:ss)
    const [hours, minutes, seconds] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0);
    
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    // If formatting fails, return original time
    return time;
  }
}