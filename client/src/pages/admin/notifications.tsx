import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define User type locally for this component
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}
import AdminLayout from "@/components/layouts/admin-layout";
import { AlertTriangle, Send, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch all users for the dropdown menu
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: notificationType === "user", // Only fetch when sending to a specific user
  });

  // Form validation
  const isValid = title.trim() !== "" && message.trim() !== "" && 
    (notificationType !== "user" || (notificationType === "user" && selectedUserId !== null));

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      userId?: number;
    }) => {
      const res = await apiRequest("POST", "/api/notifications", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "Your notification has been sent successfully.",
      });
      
      // Reset form
      setTitle("");
      setMessage("");
      setNotificationType("all");
      setSelectedUserId(null);
      
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
      type: notificationType === "user" ? "personal" : "broadcast",
      ...(notificationType === "user" && selectedUserId ? { userId: selectedUserId } : {}),
    };
    
    sendNotification.mutate(notificationData);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications Management</h1>
            <p className="text-gray-400">Send notifications to specific users</p>
          </div>
          <Button 
            onClick={() => navigate('/admin/notifications/broadcast')}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Megaphone className="h-4 w-4 mr-2" /> Broadcast to All Users
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Notification Form */}
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send Notification
              </CardTitle>
              <CardDescription>Create and send a new notification</CardDescription>
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

                <div className="space-y-3">
                  <Label className="text-white">Send To</Label>
                  <RadioGroup
                    value={notificationType}
                    onValueChange={setNotificationType}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="text-gray-300 cursor-pointer">All Users (Broadcast)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label htmlFor="user" className="text-gray-300 cursor-pointer">Specific User</Label>
                    </div>
                  </RadioGroup>
                </div>

                {notificationType === "user" && (
                  <div className="space-y-2">
                    <Label htmlFor="userId" className="text-white">Select User</Label>
                    <Select
                      value={selectedUserId?.toString() || ""}
                      onValueChange={(value) => setSelectedUserId(parseInt(value))}
                    >
                      <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-card border-gray-800">
                        {loadingUsers ? (
                          <SelectItem value="loading" disabled>Loading users...</SelectItem>
                        ) : users && Array.isArray(users) && users.length > 0 ? (
                          users.map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No users found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                        <Send className="h-4 w-4 mr-2" /> Send Notification
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
                <Users className="h-5 w-5 text-primary" />
                Notification Guidelines
              </CardTitle>
              <CardDescription>Best practices for sending notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-dark-surface p-4 rounded-md border border-gray-800">
                <h3 className="text-white font-semibold mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                  Important Information
                </h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Broadcast notifications are sent to all users</li>
                  <li>Personal notifications are only visible to the selected user</li>
                  <li>Users will see a notification badge in the header</li>
                  <li>Be concise and clear in your notification messages</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold">Notification Types</h3>
                <p className="text-gray-300 text-sm">
                  The system automatically sends notifications for:
                </p>
                <ul className="list-disc list-inside text-gray-300 text-sm pl-2 space-y-1">
                  <li>Tournament room details updates</li>
                  <li>New tournament announcements</li>
                  <li>Tournament status changes</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold">Best Practices</h3>
                <ul className="list-disc list-inside text-gray-300 text-sm pl-2 space-y-1">
                  <li>Use clear and descriptive titles</li>
                  <li>Keep messages concise and actionable</li>
                  <li>Avoid sending too many broadcasts in short periods</li>
                  <li>For urgent matters, highlight key information</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}