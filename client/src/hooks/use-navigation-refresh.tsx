import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook that automatically refreshes data when navigating between pages
 * This ensures the user always sees the latest data without manual refresh
 */
export function useNavigationRefresh() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  // When location changes, invalidate all queries to force refresh
  useEffect(() => {
    const refreshAllQueries = async () => {
      // Invalidate all queries
      await queryClient.invalidateQueries();
      
      // Force a refetch of common endpoints
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/tournaments'] }),
        queryClient.refetchQueries({ queryKey: ['/api/teams/my'] }),
        queryClient.refetchQueries({ queryKey: ['/api/registrations/user'] }),
        queryClient.refetchQueries({ queryKey: ['/api/registrations/counts'] })
      ]);
      
      console.log('Data refreshed after navigation to:', location);
    };

    refreshAllQueries();
  }, [location, queryClient]);

  return null;
}