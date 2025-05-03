import { useState, useEffect, useRef } from "react";
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

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  
  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!user) return; // Don't connect if not logged in
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    socket.onopen = () => {
      console.log('WebSocket connected for notifications');
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
          // Update notification count immediately without a query
          queryClient.setQueryData(['/api/notifications/count'], { count: data.count });
          
          // Also refresh notifications list if the dropdown is open
          if (isOpen) {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          }
        }
      } catch (error) {
        console.error('Error processing notification update:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    return () => {
      socket.close();
    };
  }, [user, queryClient, isOpen]);

  // Query to get unread notification count
  const {
    data: countData,
    isLoading: isLoadingCount,
  } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query to get notifications (only loaded when dropdown is open)
  const {
    data: notifications,
    isLoading: isLoadingNotifications,
    isFetching: isFetchingNotifications,
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: isOpen, // Only fetch when dropdown is open
  });

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
  
  // Mutation to delete all notifications
  const deleteAllNotifications = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/notifications/all", {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh notification data
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  // Count of unread notifications
  const unreadCount = countData?.count || 0;

  // Handle toggle manually
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div data-dropdown="notification">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={true}>
        <DropdownMenuTrigger asChild onClick={handleToggle}>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-full p-0"
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
          className="w-[360px] p-0 bg-dark-card border border-gray-800"
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
              {notifications && notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAllNotifications.mutate()}
                  disabled={isLoadingNotifications || deleteAllNotifications.isPending}
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
          ) : notifications && notifications.length > 0 ? (
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