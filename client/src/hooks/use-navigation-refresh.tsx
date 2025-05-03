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
      // Invalidate tournaments data
      await queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=live'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=upcoming'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=completed'] });
      
      // Also invalidate registration counts and user registrations
      await queryClient.invalidateQueries({ queryKey: ['/api/registrations/counts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/registrations/user'] });
      
      // Fetch the data right away
      await Promise.all([
        queryClient.fetchQuery({ queryKey: ['/api/tournaments'] }),
        queryClient.fetchQuery({ queryKey: ['/api/registrations/counts'] }),
      ]);
      
      console.log('Data refreshed after navigation to:', location);
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