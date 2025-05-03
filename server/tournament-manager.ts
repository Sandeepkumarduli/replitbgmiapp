/**
 * Tournament Manager
 * Handles automatic status updates for tournaments based on their date and time
 */
import { storage } from './storage';
import { Tournament } from '@shared/schema';

// Duration of a tournament in minutes before it's marked as completed
const TOURNAMENT_DURATION_MINUTES = 120; // 2 hours

/**
 * Check and update tournament statuses
 */
export async function updateTournamentStatuses(): Promise<void> {
  try {
    // Get all tournaments
    const tournaments = await storage.getAllTournaments();
    const now = new Date();
    
    console.log(`Tournament status check running at ${now.toISOString()}`);
    
    // Process each tournament
    for (const tournament of tournaments) {
      if (!tournament.date) {
        console.log(`Tournament #${tournament.id} has no date, skipping`);
        continue;
      }
      
      const tournamentDate = new Date(tournament.date);
      const endTime = new Date(tournamentDate);
      endTime.setMinutes(endTime.getMinutes() + TOURNAMENT_DURATION_MINUTES);
      
      console.log(`Tournament #${tournament.id} "${tournament.title}":`);
      console.log(`  Current status: ${tournament.status}`);
      console.log(`  Tournament time: ${tournamentDate.toISOString()}`);
      console.log(`  End time: ${endTime.toISOString()}`);
      console.log(`  Current time: ${now.toISOString()}`);
      
      // Calculate status based on time
      let newStatus = tournament.status;
      
      // If tournament date is in the past but not more than TOURNAMENT_DURATION_MINUTES ago, mark as live
      if (tournamentDate <= now && now < endTime && tournament.status !== 'live') {
        newStatus = 'live';
        console.log(`  UPDATING: Tournament date has passed but end time hasn't -> marking as LIVE`);
      }
      // If tournament end time is in the past, mark as completed
      else if (endTime <= now && tournament.status !== 'completed') {
        newStatus = 'completed';
        console.log(`  UPDATING: Tournament end time has passed -> marking as COMPLETED`);
      }
      // If tournament date is in the future, ensure it's marked as upcoming
      else if (now < tournamentDate && tournament.status !== 'upcoming') {
        newStatus = 'upcoming';
        console.log(`  UPDATING: Tournament date is in the future -> marking as UPCOMING`);
      } else {
        console.log(`  No status change needed, remaining as ${tournament.status}`);
      }
      
      // Update if status changed
      if (newStatus !== tournament.status) {
        console.log(`  Updating tournament #${tournament.id} status from ${tournament.status} to ${newStatus}`);
        await storage.updateTournament(tournament.id, { status: newStatus });
      }
    }
  } catch (error) {
    console.error('Error updating tournament statuses:', error);
  }
}

/**
 * Run the tournament status updater periodically
 * @param intervalMs Interval in milliseconds between status checks
 */
export function scheduleTournamentStatusUpdates(intervalMs: number = 60000): NodeJS.Timeout {
  console.log(`Scheduling tournament status updates every ${intervalMs / 1000} seconds`);
  
  // Run once immediately
  updateTournamentStatuses();
  
  // Then schedule for regular intervals
  return setInterval(updateTournamentStatuses, intervalMs);
}