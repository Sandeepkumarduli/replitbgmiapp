import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/admin/admin-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const notificationSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  type: z.string().default("general"),
  recipientType: z.enum(["all", "specific"]),
  userId: z.number().optional(),
  userIdInput: z.string().optional(),
});

export default function AdminNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Query for all users (to select a specific user)
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: true,
  });

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "general",
      recipientType: "all",
    },
  });

  const sendNotification = useMutation({
    mutationFn: async (data: any) => {
      // Prepare notification data based on recipientType
      const notificationData = {
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.recipientType === "specific" ? parseInt(data.userIdInput) : null,
      };

      const response = await apiRequest("POST", "/api/admin/notifications", notificationData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification sent",
        description: "The notification has been sent successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending notification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: z.infer<typeof notificationSchema>) {
    sendNotification.mutate(data);
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <Card className="border border-gray-800 bg-dark-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Send Notifications</CardTitle>
            <CardDescription className="text-gray-400">
              Send notifications to users of the tournament platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="recipientType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-white">Recipient</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <Label htmlFor="all" className="flex items-center">
                              <Users className="mr-2 h-4 w-4 text-indigo-400" />
                              All Users
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="specific" id="specific" />
                            <Label htmlFor="specific" className="flex items-center">
                              <User className="mr-2 h-4 w-4 text-blue-400" />
                              Specific User
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("recipientType") === "specific" && (
                  <FormField
                    control={form.control}
                    name="userIdInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">User ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter user ID"
                            className="bg-dark-surface border-gray-800 text-white"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400">
                          Enter the ID of the user who should receive this notification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Notification Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-dark-surface border-gray-800 text-white">
                            <SelectValue placeholder="Select notification type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-dark-surface border-gray-800">
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="tournament">Tournament</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Notification title"
                          className="bg-dark-surface border-gray-800 text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter notification message"
                          className="bg-dark-surface border-gray-800 text-white min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  disabled={sendNotification.isPending}
                >
                  {sendNotification.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Notification
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}