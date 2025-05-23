import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Phone, Gamepad, Key, Save } from "lucide-react";

const profileFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Please enter a valid email").optional(),
  phone: z.string().min(10, "Please enter a valid phone number").optional(),
  gameId: z.string().min(3, "Game ID must be at least 3 characters").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set a new password",
  path: ["currentPassword"],
}).refine(data => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function UserProfile() {
  const { isAuthenticated, isAdmin, isLoading, user, updateProfile, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      gameId: user?.gameId || "",
      phone: "", // Phone would be fetched from user data
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }

    if (!isLoading && isAuthenticated && isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        gameId: user.gameId || "",
        phone: user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Extract only the fields we want to update
      const updateData: any = {};
      
      // Only include fields that have actually changed
      if (data.username && data.username !== user?.username) updateData.username = data.username;
      if (data.email && data.email !== user?.email) updateData.email = data.email;
      if (data.phone && data.phone !== user?.phone) updateData.phone = data.phone;
      if (data.gameId && data.gameId !== user?.gameId) updateData.gameId = data.gameId;
      
      console.log("Current field values:", {
        username: data.username,
        userUsername: user?.username,
        email: data.email, 
        userEmail: user?.email,
        phone: data.phone,
        userPhone: user?.phone,
        gameId: data.gameId,
        userGameId: user?.gameId
      });
      
      // Handle password change
      if (data.newPassword) {
        if (!data.currentPassword) {
          toast({
            title: "Error",
            description: "Current password is required to set a new password",
            variant: "destructive",
          });
          return;
        }
        
        // Include both the new password and current password in the update
        updateData.password = data.newPassword;
        updateData.currentPassword = data.currentPassword;
      }
      
      // Only proceed if there are changes to make
      if (Object.keys(updateData).length > 0) {
        console.log("Updating profile with changes:", Object.keys(updateData));
        
        try {
          // Use the updateProfile method from auth context
          const response = await updateProfile(updateData);
          console.log("Profile update response:", response);
          
          // Reset password fields
          form.setValue("currentPassword", "");
          form.setValue("newPassword", "");
          form.setValue("confirmPassword", "");
          
          // Show success message
          if (!data.newPassword) {
            toast({
              title: "Profile Updated",
              description: "Your profile has been successfully updated.",
            });
          }
          
          // If password was changed, logout and redirect to login page
          if (response && response.passwordChanged) {
            toast({
              title: "Password Changed",
              description: "Your password has been updated. Please log in again with your new password.",
            });
            
            // Set a small timeout to allow the toast to be seen
            setTimeout(() => {
              logout();
            }, 1500);
          }
        } catch (updateError) {
          console.error("Failed to update profile:", updateError);
          toast({
            title: "Update Failed",
            description: updateError instanceof Error ? updateError.message : "An error occurred updating your profile.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "No changes",
          description: "No changes were made to your profile",
        });
      }
    } catch (error) {
      console.error("Error in profile form submission:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Your Profile</h1>

        <div className="grid gap-8">
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-gray-400">
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            Username
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your username"
                              className="bg-dark-surface border-gray-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-400">
                            Your public display name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Your email"
                              className="bg-dark-surface border-gray-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your phone number"
                              className="bg-dark-surface border-gray-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gameId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white flex items-center">
                            <Gamepad className="h-4 w-4 mr-2 text-gray-400" />
                            Game ID
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your BGMI game ID"
                              className="bg-dark-surface border-gray-700 text-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white flex items-center">
                              <Key className="h-4 w-4 mr-2 text-gray-400" />
                              Current Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Your current password"
                                className="bg-dark-surface border-gray-700 text-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="hidden md:block"></div>

                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white flex items-center">
                              <Key className="h-4 w-4 mr-2 text-gray-400" />
                              New Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="New password"
                                className="bg-dark-surface border-gray-700 text-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white flex items-center">
                              <Key className="h-4 w-4 mr-2 text-gray-400" />
                              Confirm Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm new password"
                                className="bg-dark-surface border-gray-700 text-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
