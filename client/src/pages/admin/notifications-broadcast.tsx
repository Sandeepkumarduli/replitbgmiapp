import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "@/components/layouts/admin-layout";
import { AlertTriangle, Send } from "lucide-react";

export default function AdminNotificationsBroadcastPage() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Form validation
  const isValid = title.trim() !== "" && message.trim() !== "";

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
    }) => {
      const res = await apiRequest("POST", "/api/notifications", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "Your notification has been sent to all users.",
      });
      
      // Reset form
      setTitle("");
      setMessage("");
      
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send notification: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const notificationData = {
      title,
      message,
      type: "broadcast",
    };
    
    sendNotification.mutate(notificationData);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Broadcast Notifications</h1>
            <p className="text-gray-400">Send notifications to all users with one click</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Notification Form */}
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send Broadcast Notification
              </CardTitle>
              <CardDescription>Message will be sent to all users</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Notification Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter notification title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-dark-surface border-gray-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter notification message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-dark-surface border-gray-700 text-white min-h-[120px]"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={!isValid || sendNotification.isPending}
                  >
                    {sendNotification.isPending ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">⏳</span> Sending...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Send className="h-4 w-4 mr-2" /> Send to All Users
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips and Information Card */}
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Important Guidelines
              </CardTitle>
              <CardDescription>Best practices for broadcasting notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-dark-surface p-4 rounded-md border border-gray-800">
                <h3 className="text-white font-semibold mb-2">Use Broadcasts Wisely</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Notifications are sent to <strong>all users</strong> immediately</li>
                  <li>Users will see a notification badge in their header</li>
                  <li>Old notifications are automatically cleared after 24 hours</li>
                  <li>Users can mark notifications as read to dismiss them</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold">Recommended Uses</h3>
                <ul className="list-disc list-inside text-gray-300 text-sm pl-2 space-y-1">
                  <li>Important tournament announcements</li>
                  <li>Site maintenance notifications</li>
                  <li>New feature announcements</li>
                  <li>Critical updates or changes</li>
                </ul>
              </div>

              <div className="mt-4 p-3 bg-amber-950/40 border border-amber-800/40 rounded-md">
                <p className="text-amber-300 text-sm">
                  <strong>Note:</strong> To minimize notification fatigue, limit broadcasts 
                  to important information only. For targeted messaging, use the 
                  advanced notification options in the admin panel.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}