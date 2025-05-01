/**
 * This module provides functionality to backup in-memory data to JSON files
 * and restore data from those backups
 */

import fs from 'fs';
import path from 'path';
import { storage } from './storage';
import { MemStorage } from './storage';

// Define the data directory path
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'memory-data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Interface for the backup data structure
interface BackupData {
  users: any[];
  teams: any[];
  teamMembers: any[];
  tournaments: any[];
  registrations: any[];
}

/**
 * Backup in-memory data to a JSON file
 */
export async function backupData(): Promise<void> {
  try {
    // Only proceed if using in-memory storage
    if (!(storage instanceof MemStorage)) {
      console.log('Backup skipped - not using in-memory storage');
      return;
    }
    
    // Access the internal maps from the MemStorage instance
    const memStorage = storage as MemStorage;
    
    // Extract data from private maps using a type assertion
    // Note: This is a bit hacky, but necessary to access private members
    const users = Array.from((memStorage as any).users.values());
    const teams = Array.from((memStorage as any).teams.values());
    const teamMembers = Array.from((memStorage as any).teamMembers.values());
    const tournaments = Array.from((memStorage as any).tournaments.values());
    const registrations = Array.from((memStorage as any).registrations.values());
    
    // Prepare backup data
    const backupData: BackupData = {
      users,
      teams,
      teamMembers,
      tournaments,
      registrations
    };
    
    // Write to file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2));
    console.log(`Data backed up to ${BACKUP_FILE}`);
  } catch (error) {
    console.error('Error backing up data:', error);
  }
}

/**
 * Schedule periodic backups
 */
export function scheduleBackups(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  console.log(`Scheduling automatic backups every ${intervalMs / 1000} seconds`);
  return setInterval(backupData, intervalMs);
}

// Export or load initial data
export async function initializeBackup(): Promise<void> {
  // Create the backup file if it doesn't exist
  if (!fs.existsSync(BACKUP_FILE)) {
    await backupData();
  }
}