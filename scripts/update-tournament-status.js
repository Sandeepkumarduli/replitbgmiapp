/**
 * This script manually triggers a tournament status update
 * Useful for testing the status update functionality
 */

const { updateTournamentStatuses } = require('../dist/tournament-manager');

console.log('Manually triggering tournament status update...');
updateTournamentStatuses()
  .then(() => {
    console.log('Tournament status update complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error updating tournament statuses:', error);
    process.exit(1);
  });