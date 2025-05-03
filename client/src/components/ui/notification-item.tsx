import { Bell, Calendar, Info, AlertTriangle, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Notification } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "./button";
import { useState, useEffect } from "react";

interface NotificationItemProps {
  notification: Notification;
  className?: string;
  showActions?: boolean;
}

export function NotificationItem({ 
  notification, 
  className,
  showActions = true 
}: NotificationItemProps) {
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(true);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(notification.isRead);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  // When notification changes to read state, animate out after delay
  useEffect(() => {
    if (isMarkedAsRead && !notification.isRead) {
      // Handle the case when we've marked it as read locally but the server hasn't updated yet
      setIsFadingOut(true);
      
      // Remove from UI after fade animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 400); // Match this with the CSS transition duration
      
      return () => clearTimeout(timer);
    }
  }, [isMarkedAsRead, notification.isRead]);
  
  // Mutation to mark a notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      // Set locally immediately for better UX
      setIsMarkedAsRead(true);
      
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh notification data
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    }
  });

  // Get the appropriate icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case "tournament":
        return <Calendar className="h-5 w-5 text-green-400" />;
      case "important":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "announcement":
        return <Info className="h-5 w-5 text-blue-400" />;
      default:
        return <Bell className="h-5 w-5 text-indigo-400" />;
    }
  };

  // Format the notification's creation date
  const formattedDate = notification.createdAt 
    ? format(new Date(notification.createdAt), "MMM d, h:mm a") 
    : "";

  // If the notification should be hidden, return null
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "border-b border-gray-800 p-4 flex flex-col gap-2 transition-all duration-300",
        notification.isRead ? "bg-dark-surface" : "bg-dark-card",
        isFadingOut ? "opacity-0 scale-95" : "opacity-100 scale-100",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h4 className={cn(
            "font-medium mb-1",
            notification.isRead ? "text-gray-300" : "text-white"
          )}>
            {notification.title}
          </h4>
          <p className="text-gray-400 text-sm whitespace-pre-wrap">
            {notification.message}
          </p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">{formattedDate}</span>
            
            {showActions && !notification.isRead && !isMarkedAsRead && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-7 px-2 border-gray-700 hover:bg-dark-surface"
                onClick={() => markAsRead.mutate(notification.id)}
                disabled={markAsRead.isPending}
              >
                {markAsRead.isPending ? (
                  <span className="animate-spin mr-1">⏳</span>
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Mark as read
              </Button>
            )}
            
            {isMarkedAsRead && !notification.isRead && (
              <span className="text-xs text-green-500 flex items-center">
                <Check className="h-3.5 w-3.5 mr-1" />
                Marked as read
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}