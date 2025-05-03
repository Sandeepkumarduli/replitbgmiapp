import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TournamentList } from "@/components/user/tournament-list-fixed";
import { TeamCard } from "@/components/ui/team-card";
import { JoinTeamForm } from "@/components/user/join-team-form";
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  CalendarCheck,
  User,
  RefreshCw,
  Plus
} from "lucide-react";

export default function UserDashboard() {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<'upcoming' | 'live' | 'all' | 'completed'>('all');

  // Redirect if not authenticated or is admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/login");
      } else if (isAdmin) {
        navigate("/admin/dashboard");
      }
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);
  
  // Auto-refresh when the component mounts or regains focus
  useEffect(() => {
    // Define a function to refresh data
    const refreshData = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/user"] });
    };
    
    // Refresh on mount
    refreshData();
    
    // Refresh when the window regains focus
    const handleFocus = () => {
      refreshData();
    };
    
    // Add event listener
    window.addEventListener('focus', handleFocus);
    
    // Cleanup function
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, isAuthenticated]);

  // Fetch user teams
  const { data: teams, isLoading: isLoadingTeams, refetch: refetchTeams } = useQuery<any[]>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 seconds before considering data stale
  });

  // Fetch user registrations
  const { data: registrations, isLoading: isLoadingRegistrations, refetch: refetchRegistrations } = useQuery<any[]>({
    queryKey: ["/api/registrations/user"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 seconds before considering data stale
  });
  
  // Handle refresh data
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Force refetch all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/registrations/user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] }),
        // Force refetch team members data
        refetchTeams(),
        refetchRegistrations()
      ]);
      
      // After invalidating queries, force a refetch
      await Promise.all([
        refetchTeams(),
        refetchRegistrations()
      ]);
      
      toast({
        title: "Dashboard refreshed",
        description: "Your data has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to update your data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">User Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your tournaments, teams, and profile</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing || isLoadingTeams || isLoadingRegistrations}
            className="bg-primary hover:bg-primary/90 text-white mt-4 sm:mt-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Dashboard'}
          </Button>
        </div>

        {/* Top Row: Profile and Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-dark-card border-gray-800 shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-xl">My Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex-shrink-0 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white">{user?.username}</h3>
                    <p className="text-gray-400">Game ID: {user?.gameId}</p>
                  </div>
                  <Link href="/user/profile" className="w-full">
                    <Button variant="outline" size="sm" className="border-gray-700 text-white hover:bg-dark-surface w-full">
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Card */}
          <div className="lg:col-span-3">
            <Card className="bg-dark-card border-gray-800 shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-xl">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-dark-surface p-4 rounded-lg border border-gray-800">
                    <Trophy className="h-6 w-6 text-primary mb-2" />
                    <p className="text-2xl font-bold text-white">{registrations?.length || 0}</p>
                    <p className="text-gray-400 text-sm">Tournaments Joined</p>
                  </div>
                  <div className="bg-dark-surface p-4 rounded-lg border border-gray-800">
                    <Users className="h-6 w-6 text-accent mb-2" />
                    <p className="text-2xl font-bold text-white">{teams?.length || 0}</p>
                    <p className="text-gray-400 text-sm">Teams Created</p>
                  </div>
                  <div className="bg-dark-surface p-4 rounded-lg border border-gray-800">
                    <Clock className="h-6 w-6 text-secondary mb-2" />
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-gray-400 text-sm">Matches Played</p>
                  </div>
                  <div className="bg-dark-surface p-4 rounded-lg border border-gray-800">
                    <CalendarCheck className="h-6 w-6 text-[#00CC66] mb-2" />
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-gray-400 text-sm">Tournaments Won</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Teams Card */}
        <Card className="bg-dark-card border-gray-800 shadow-lg mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-white text-xl">My Teams</CardTitle>
            </div>
            <Link href="/user/team" className="inline-block">
              <Button variant="link" className="text-accent hover:text-accent/80 p-0 h-auto">
                Manage All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingTeams ? (
              <p className="text-gray-400">Loading teams...</p>
            ) : teams && teams.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {teams.slice(0, 2).map((team: any) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
                {teams.length > 2 && (
                  <p className="text-gray-400 text-sm text-center mt-2">
                    +{teams.length - 2} more teams
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Link href="/user/team" className="inline-block">
                    <Button 
                      variant="outline"
                      className="border-gray-700 text-white hover:bg-dark-surface w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Teams
                    </Button>
                  </Link>
                  {teams && teams.length < 3 && (
                    <Link href="/user/team" className="inline-block">
                      <Button 
                        variant="outline"
                        className="border-indigo-600 text-indigo-400 hover:bg-indigo-600/10 w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Join Team
                      </Button>
                    </Link>
                  )}
                </div>
                
                {/* Join Team Form */}
                {teams && teams.length < 3 && (
                  <div className="mt-6 border-t border-gray-800 pt-6">
                    <JoinTeamForm />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-center py-6">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">You haven't created any teams yet</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/user/team" className="inline-block">
                      <Button className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create a Team
                      </Button>
                    </Link>
                    <Link href="/user/team" className="inline-block">
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Join a Team
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {/* Join Team Form */}
                <div className="mt-4 border-t border-gray-800 pt-6">
                  <JoinTeamForm />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Registered Tournaments - Full Width */}
        <Card className="bg-dark-card border-gray-800 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-white text-xl">My Registered Tournaments</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/tournaments" className="inline-block">
                <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
                  Browse All Tournaments
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-2">
              {/* Tournament Status Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className={`${tournamentFilter === 'upcoming' 
                    ? 'bg-amber-600 text-white hover:bg-amber-700' 
                    : 'bg-dark-surface border-gray-700 hover:bg-dark-surface/80 text-gray-300'}`}
                  onClick={() => setTournamentFilter('upcoming')}
                >
                  Upcoming
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className={`${tournamentFilter === 'live' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-dark-surface border-gray-700 hover:bg-dark-surface/80 text-gray-300'}`}
                  onClick={() => setTournamentFilter('live')}
                >
                  Live
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className={`${tournamentFilter === 'all' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700' 
                    : 'bg-dark-surface border-gray-700 hover:bg-dark-surface/80 text-gray-300'}`}
                  onClick={() => setTournamentFilter('all')}
                >
                  All
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className={`${tournamentFilter === 'completed' 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-dark-surface border-gray-700 hover:bg-dark-surface/80 text-gray-300'}`}
                  onClick={() => setTournamentFilter('completed')}
                >
                  Completed
                </Button>
              </div>
              
              {/* Registered tournaments with enhanced visibility */}
              <div className="bg-dark-surface rounded-lg border border-gray-800 p-4">
                <h3 className="text-white font-medium mb-3">Your Registered Tournaments</h3>
                {/* The TournamentList component now handles single column display when showRegisteredOnly is true */}
                <TournamentList showRegisteredOnly={true} limit={4} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}