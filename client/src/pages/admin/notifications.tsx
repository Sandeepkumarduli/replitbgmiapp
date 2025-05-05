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
import AdminLayout from "@/components/layouts/admin-layout";
import { AlertTriangle, Search, Send, Users, Megaphone, Check, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Define User type locally for this component
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Fetch all users for the user selection
  const { 
    data: users = [], 
    isLoading: loadingUsers, 
    error: userError 
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: 1, // Only retry once
    refetchOnWindowFocus: false,
    select: (data) => Array.isArray(data) ? data : []
  });
  
  // Show error toast if user fetch fails
  if (userError) {
    console.error("Error fetching users:", userError);
    toast({
      title: "Error",
      description: "Failed to load users. Please try again.",
      variant: "destructive",
    });
  }

  // Filter users based on search query
  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Form validation
  const isValid = title.trim() !== "" && message.trim() !== "" && 
    (notificationType !== "user" || (notificationType === "user" && selectedUserId !== null)) &&
    (notificationType !== "selected" || (notificationType === "selected" && selectedUserIds.length > 0));

  // Send notification mutation with error handling
  const sendNotification = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      userId?: number;
      userIds?: number[];
    }) => {
      try {
        const res = await apiRequest("POST", "/api/notifications", data);
        const jsonResponse = await res.json();
        return jsonResponse;
      } catch (error) {
        console.error("Error parsing response:", error);
        throw new Error("Failed to parse server response. Please try again.");
      }
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: notificationType === "all" 
          ? "Your notification has been broadcast to all users." 
          : "Your notification has been sent successfully.",
      });
      
      // Reset form
      setTitle("");
      setMessage("");
      setSelectedUserId(null);
      setSelectedUserIds([]);
      
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
    
    let notificationData: any = {
      title,
      message,
      type: notificationType === "all" ? "broadcast" : "personal",
    };
    
    if (notificationType === "user" && selectedUserId) {
      notificationData.userId = selectedUserId;
    } else if (notificationType === "selected" && selectedUserIds.length > 0) {
      notificationData.userIds = selectedUserIds;
    }
    
    sendNotification.mutate(notificationData);
  };

  // Handle user selection for multiple users
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Notification Center</h1>
          <p className="text-gray-400">Send targeted notifications or broadcast messages to all users</p>
        </div>

        <Tabs defaultValue="broadcast" className="w-full">
          <TabsList className="bg-dark-surface border border-gray-800 mb-6">
            <TabsTrigger value="broadcast" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Megaphone className="h-4 w-4 mr-2" />
              Broadcast
            </TabsTrigger>
            <TabsTrigger value="targeted" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="h-4 w-4 mr-2" />
              User Notifications
            </TabsTrigger>
          </TabsList>
          
          {/* Broadcast Tab */}
          <TabsContent value="broadcast" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-dark-card border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Broadcast to All Users
                  </CardTitle>
                  <CardDescription>Send a notification to all users at once</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="hidden" value="all" onChange={() => setNotificationType("all")} />
                    
                    <div className="space-y-2">
                      <Label htmlFor="broadcast-title" className="text-white">Notification Title</Label>
                      <Input
                        id="broadcast-title"
                        placeholder="Enter notification title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-dark-surface border-gray-700 text-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="broadcast-message" className="text-white">Message</Label>
                      <Textarea
                        id="broadcast-message"
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
                        disabled={!title || !message || sendNotification.isPending}
                      >
                        {sendNotification.isPending ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2">⏳</span> Sending...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Megaphone className="h-4 w-4 mr-2" /> Broadcast to All Users
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

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
                      User Notifications tab.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Targeted Notifications Tab */}
          <TabsContent value="targeted" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-dark-card border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Send Targeted Notification
                  </CardTitle>
                  <CardDescription>Send to specific users or individuals</CardDescription>
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
                          <RadioGroupItem value="user" id="user" />
                          <Label htmlFor="user" className="text-gray-300 cursor-pointer">Single User</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="selected" id="selected" />
                          <Label htmlFor="selected" className="text-gray-300 cursor-pointer">Multiple Users</Label>
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

                    {notificationType === "selected" && (
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Label htmlFor="search" className="text-white mr-2">Search Users</Label>
                          <Badge variant="outline" className="ml-auto">
                            {selectedUserIds.length} selected
                          </Badge>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            id="search"
                            placeholder="Search by username or email"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-dark-surface border-gray-700 text-white pl-8"
                          />
                        </div>
                        
                        <div className="bg-dark-surface border border-gray-700 rounded-md h-48 overflow-y-auto">
                          {loadingUsers ? (
                            <div className="flex items-center justify-center h-full">
                              <span className="animate-spin mr-2">⏳</span> Loading users...
                            </div>
                          ) : filteredUsers && filteredUsers.length > 0 ? (
                            <div className="p-1">
                              {filteredUsers.map(user => (
                                <div 
                                  key={user.id}
                                  className={`flex items-center p-2 rounded-md cursor-pointer ${
                                    selectedUserIds.includes(user.id) 
                                      ? 'bg-primary/20 text-primary' 
                                      : 'hover:bg-dark-card text-gray-300'
                                  }`}
                                  onClick={() => toggleUserSelection(user.id)}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{user.username}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                  </div>
                                  {selectedUserIds.includes(user.id) && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                              <Info className="h-5 w-5 mb-2" />
                              {searchQuery ? 'No matching users found' : 'No users available'}
                            </div>
                          )}
                        </div>
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
                      <li>Personal notifications are only visible to the selected user(s)</li>
                      <li>Users will see a notification badge in the header</li>
                      <li>Be concise and clear in your notification messages</li>
                      <li>Use this feature for tournament-specific communications</li>
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
                      <li>Target notifications to relevant users</li>
                      <li>For urgent matters, highlight key information</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}