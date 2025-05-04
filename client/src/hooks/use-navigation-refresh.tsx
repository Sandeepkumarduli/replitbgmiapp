import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

/**
 * A custom hook that refreshes data when navigating between pages
 * This helps ensure we always have fresh data, especially for tournament lists
 */
export function useNavigationRefresh() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Invalidate key queries when navigation happens
    const refreshData = async () => {
      try {
        // Invalidate tournaments data
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=live'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=upcoming'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=completed'] });
        
        // Invalidate user-related data
        queryClient.invalidateQueries({ queryKey: ['/api/registrations/counts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/registrations/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/teams/my'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        // Fetch the data in parallel with error handling
        try {
          await Promise.allSettled([
            queryClient.fetchQuery({ queryKey: ['/api/tournaments'] }),
            queryClient.fetchQuery({ queryKey: ['/api/registrations/counts'] }),
            queryClient.fetchQuery({ queryKey: ['/api/user'] }),
          ]);
        } catch (fetchError) {
          // Some fetch queries may be rejected, but this is handled silently
        }
        
        // Data successfully refreshed after navigation
      } catch (error) {
        // Errors during data refresh are caught but we continue execution
      }
    };
    
    refreshData();
  }, [location, queryClient]);
}

/**
 * A component that uses the useNavigationRefresh hook
 * Include this component in your app layout to enable automatic data refresh
 */
export function NavigationRefresh() {
  useNavigationRefresh();
  return null;
}