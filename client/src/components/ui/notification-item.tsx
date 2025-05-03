import { Bell, Calendar, Info, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Notification } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "./button";

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
  
  // Mutation to mark a notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
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

  return (
    <div 
      className={cn(
        "border-b border-gray-800 p-4 flex flex-col gap-2",
        notification.isRead ? "bg-dark-surface" : "bg-dark-card",
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
            
            {showActions && !notification.isRead && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs h-7 px-2 border-gray-700 hover:bg-dark-surface"
                onClick={() => markAsRead.mutate(notification.id)}
                disabled={markAsRead.isPending}
              >
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}