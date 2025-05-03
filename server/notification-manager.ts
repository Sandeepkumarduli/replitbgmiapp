import { storage } from './storage';

// Function to clean up old notifications (older than 1 day)
export async function cleanupOldNotifications(): Promise<void> {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1); // Subtract 1 day
    
    const result = await storage.cleanupOldNotifications(oneDayAgo);
    
    console.log(`Notification cleanup: Removed ${result} old notifications older than ${oneDayAgo.toISOString()}`);
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
}

// Schedule notification cleanup to run periodically
export function scheduleNotificationCleanup(intervalMs: number = 6 * 60 * 60 * 1000): NodeJS.Timeout {
  // Default to run every 6 hours (6 * 60 * 60 * 1000 ms)
  return setInterval(cleanupOldNotifications, intervalMs);
}