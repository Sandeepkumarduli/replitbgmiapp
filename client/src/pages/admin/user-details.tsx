import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layouts/admin-layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Shield, 
  Users as UsersIcon, 
  Trophy, 
  Award, 
  Calendar, 
  ArrowLeft,
  Ban,
  CheckCircle2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User, Tournament, Team, TeamMember, Registration } from "@shared/schema";

// Extended interfaces with additional properties for UI display
interface EnhancedUser extends User {
  status?: string;
}

interface EnhancedTeam extends Team {
  members?: number;
}

interface EnhancedRegistration extends Registration {
  tournamentTitle?: string;
  teamName?: string;
  status?: string;
}
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UserDetails() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Extract user ID from URL
  const userId = parseInt(location.split("/").pop() || "0");
  
  // Fetch user data
  const { data: user, isLoading: isUserLoading } = useQuery<EnhancedUser>({
    queryKey: [`/api/admin/users/${userId}`],
    enabled: !!userId && isAuthenticated && isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch user's teams
  const { data: teams } = useQuery<EnhancedTeam[]>({
    queryKey: [`/api/admin/users/${userId}/teams`],
    enabled: !!userId && isAuthenticated && isAdmin,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch user's registrations
  const { data: registrations } = useQuery<EnhancedRegistration[]>({
    queryKey: [`/api/admin/users/${userId}/registrations`],
    enabled: !!userId && isAuthenticated && isAdmin,
    staleTime: 5 * 60 * 1000,
  });
  
  // Add mutation to update user status (ban/unban)
  const updateUserStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/admin/users/${data.id}`, 
        { status: data.status }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      toast({
        title: "User status updated",
        description: "The user status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // If unable to parse userId or it's 0, redirect to users list
  useEffect(() => {
    if (!isLoading && (!userId || userId === 0)) {
      navigate("/admin/users");
    }
  }, [userId, isLoading, navigate]);
  
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  if (isLoading || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin || !user) {
    return null;
  }
  
  const handleBanUser = () => {
    updateUserStatusMutation.mutate({
      id: user.id,
      status: user.status === "banned" ? "active" : "banned"
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white p-2"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-3xl font-bold text-white">User Details</h1>
          </div>
          
          <Button
            variant={user.status === "banned" ? "outline" : "destructive"}
            onClick={handleBanUser}
          >
            {user.status === "banned" ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Unban User
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Ban User
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card className="bg-dark-card border-gray-800 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-primary/10 rounded-full h-24 w-24 flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-primary" />
                </div>
              </div>
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">{user.username}</h2>
                <Badge 
                  className={`mt-1 ${user.role === 'admin' 
                    ? 'bg-primary/10 text-primary border-primary' 
                    : 'bg-accent/10 text-accent border-accent'}`}
                >
                  {user.role}
                </Badge>
                {user.status === "banned" && (
                  <Badge className="ml-2 bg-red-900/20 text-red-500 border-red-500">
                    Banned
                  </Badge>
                )}
              </div>
              
              <Separator className="bg-gray-800" />
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-300">{user.email || "No email"}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-300">{user.phone || "No phone"}</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-300">Role: {user.role}</span>
                </div>
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-300">Game ID: {user.gameId || "Not provided"}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-300">
                    Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Tab */}
          <Card className="bg-dark-card border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">User Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="teams" className="w-full">
                <TabsList className="bg-dark-surface mb-6 border border-gray-800">
                  <TabsTrigger value="teams" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    Teams
                  </TabsTrigger>
                  <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    Tournaments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="teams" className="space-y-6">
                  <div className="rounded-md border border-gray-800">
                    {teams && teams.length > 0 ? (
                      <div className="divide-y divide-gray-800">
                        {teams.map((team) => (
                          <div key={team.id} className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <UsersIcon className="h-5 w-5 text-primary mr-2" />
                                <span className="text-white font-medium">{team.name}</span>
                              </div>
                              <Badge className="bg-dark-surface text-gray-300 border-gray-700">
                                {team.members} members
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Created: {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "Unknown"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-gray-400">No teams found for this user</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tournaments" className="space-y-6">
                  <div className="rounded-md border border-gray-800">
                    {registrations && registrations.length > 0 ? (
                      <div className="divide-y divide-gray-800">
                        {registrations.map((registration) => (
                          <div key={registration.id} className="p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Trophy className="h-5 w-5 text-accent mr-2" />
                                <span className="text-white font-medium">{registration.tournamentTitle}</span>
                              </div>
                              <Badge className={`
                                ${registration.status === 'confirmed' ? 'bg-green-900/20 text-green-500 border-green-500' : 
                                  registration.status === 'pending' ? 'bg-amber-900/20 text-amber-500 border-amber-500' :
                                  'bg-red-900/20 text-red-500 border-red-500'}
                              `}>
                                {registration.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Registered: {registration.registeredAt ? new Date(registration.registeredAt).toLocaleDateString() : "Unknown"}
                            </p>
                            <p className="text-sm text-gray-400">
                              Team: {registration.teamName}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-gray-400">No tournament registrations found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}