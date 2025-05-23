import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BellRing, BellOff, Check, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NotificationItem } from "./notification-item";
import { Notification } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  
  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user) return; // Don't connect if not logged in
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    socket.onopen = () => {
      // Authenticate the WebSocket connection with user ID
      if (user.id) {
        socket.send(JSON.stringify({
          type: 'auth',
          userId: user.id
        }));
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'notification_update') {
          // If this is a hide action from another device of the same user, save to localStorage
          if (data.isHideAction && user) {
            localStorage.setItem(`notifications_cleared_${user.id}`, 'true');
            setHiddenNotifications(true);
          }
          // If this is a regular notification update with new notifications
          else if (data.count > 0 && user && !data.isHideAction) {
            // Remove the localStorage flag so new notifications can be seen
            localStorage.removeItem(`notifications_cleared_${user.id}`);
            setHiddenNotifications(false);
          }
          
          // Update notification count immediately without a query
          queryClient.setQueryData(['/api/notifications/count'], { count: data.count });
          
          // If we have any notifications, make sure to show them by clearing the hidden state
          if (data.count > 0 && !data.isHideAction) {
            localStorage.removeItem(`notifications_cleared_${user.id}`);
            setHiddenNotifications(false);
          }
          
          // Always force refresh notifications on updates to ensure we have the latest data
          queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
      } catch (error) {
        console.error('Error processing notification update:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      // Connection closed, will reconnect when component remounts
    };
    
    return () => {
      socket.close();
    };
  }, [user, queryClient, isOpen]);

  // Check if we need to skip notifications fetch based on localStorage
  const shouldSkipNotifications = useCallback(() => {
    if (!user) return false;
    return localStorage.getItem(`notifications_cleared_${user.id}`) === 'true';
  }, [user]);

  // Query to get unread notification count - always fetch for logged-in users
  const {
    data: countData,
    isLoading: isLoadingCount,
  } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000, // Refetch every 30 seconds
    initialData: { count: 0 },
    enabled: !!user, // Always fetch for logged-in users
  });

  // Query to get notifications (only loaded when dropdown is open and not cleared)
  const {
    data: notifications,
    isLoading: isLoadingNotifications,
    isFetching: isFetchingNotifications,
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    // Only fetch when dropdown is open OR if we need to check if there are notifications
    // This ensures we fetch on login to check notification status
    enabled: (isOpen || !!user) && !shouldSkipNotifications(),
    staleTime: 60000, // Keep data fresh for 60 seconds
    initialData: [], // Start with empty array
  });
  
  // Process notifications data whenever it changes
  useEffect(() => {
    // If we get notifications and there's a count, make sure hiddenNotifications is false
    if (notifications && notifications.length > 0 && user) {
      const wasCleared = localStorage.getItem(`notifications_cleared_${user.id}`) === 'true';
      if (!wasCleared) {
        setHiddenNotifications(false);
      }
    }
  }, [notifications, user]);

  // Mutation to mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notifications/mark-all-read", {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh notification data
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });
  
  // Frontend-only clear all notifications that persists across page refreshes
  // Initialize state from localStorage if user is logged in
  const [hiddenNotifications, setHiddenNotifications] = useState<boolean>(() => {
    if (!user) return false;
    // Check if we've previously cleared notifications for this user
    return localStorage.getItem(`notifications_cleared_${user.id}`) === 'true';
  });
  
  // When notifications load, check if they should be hidden based on previous user action
  useEffect(() => {
    if (!user) return;
    
    const wasCleared = localStorage.getItem(`notifications_cleared_${user.id}`) === 'true';
    
    if (wasCleared) {
      // If notifications were cleared by this user before, hide them but DON'T set count to 0
      // This allows new notifications to show up even if old ones were cleared
      setHiddenNotifications(true);
    } else {
      // If not cleared, make sure they're shown
      setHiddenNotifications(false);
    }
  }, [user]);
  
  // This function clears notifications by calling the hide API
  const clearAllNotifications = async () => {
    if (!user) return;
    
    try {
      // Create a temporary empty array to replace the notifications list immediately
      const tempEmptyNotifications: Notification[] = [];
      
      // Immediately update UI with empty notifications
      queryClient.setQueryData(["/api/notifications"], tempEmptyNotifications);
      queryClient.setQueryData(["/api/notifications/count"], { count: 0 });
      
      // Hide notifications in the UI
      setHiddenNotifications(true);
      
      // Store this preference in localStorage to persist across page refreshes
      localStorage.setItem(`notifications_cleared_${user.id}`, 'true');
      
      // Now call the API (the UI is already updated for better responsiveness)
      await apiRequest("POST", "/api/notifications/hide", {});
      
      // After successful API call, refresh data to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      
      // Show success toast
      toast({
        title: "Notifications cleared",
        description: "All notifications have been cleared from your view.",
      });
    } catch (error) {
      console.error("Error hiding notifications:", error);
      
      // If error occurs, refresh the data to ensure UI is in sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      
      // Remove the cleared state since there was an error
      localStorage.removeItem(`notifications_cleared_${user.id}`);
      setHiddenNotifications(false);
      
      toast({
        title: "Error",
        description: "Failed to clear notifications. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Count of unread notifications
  const unreadCount = countData?.count || 0;

  // Handle toggle manually
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div data-dropdown="notification">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild onClick={handleToggle} className="focus:outline-none focus:ring-0">
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-full p-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          >
            <BellRing className="h-5 w-5 text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-indigo-600 text-[10px] font-medium text-white flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[360px] p-0 bg-dark-card border border-gray-800 focus:outline-none shadow-lg shadow-black/50"
        >
          <div className="flex flex-col p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={isLoadingNotifications || markAllAsRead.isPending || (unreadCount === 0)}
                className="text-xs h-8"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
              {notifications && notifications.length > 0 && !hiddenNotifications && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  disabled={isLoadingNotifications}
                  className="text-xs h-8 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {isLoadingNotifications ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications && notifications.length > 0 && !hiddenNotifications ? (
            <>
              <ScrollArea className="h-[300px]">
                <div className="flex flex-col">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <BellOff className="h-8 w-8 text-gray-500 mb-2" />
              <p className="text-gray-400">No notifications</p>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}