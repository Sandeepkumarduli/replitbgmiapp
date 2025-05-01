import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TournamentList } from "@/components/user/tournament-list";
import { TeamCard } from "@/components/ui/team-card";
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  CalendarCheck,
  User 
} from "lucide-react";

export default function UserDashboard() {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

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

  // Fetch user teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery<any[]>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  // Fetch user registrations
  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery<any[]>({
    queryKey: ["/api/registrations/user"],
    enabled: isAuthenticated,
  });

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">User Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your tournaments, teams, and profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card className="bg-dark-card border-gray-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl">My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{user?.username}</h3>
                  <p className="text-gray-400">Game ID: {user?.gameId}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link href="/user/profile" className="inline-block">
                  <Button variant="outline" size="sm" className="border-gray-700 text-white hover:bg-dark-surface">
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Teams Card */}
          <Card className="bg-dark-card border-gray-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl">My Teams</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTeams ? (
                <p className="text-gray-400">Loading teams...</p>
              ) : teams && teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.slice(0, 2).map((team: any) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                  {teams.length > 2 && (
                    <p className="text-gray-400 text-sm text-center mt-2">
                      +{teams.length - 2} more teams
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">You haven't created any teams yet</p>
                  <Link href="/user/team/create" className="inline-block">
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      Create a Team
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card className="bg-dark-card border-gray-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
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

        {/* Registered Tournaments */}
        <Card className="bg-dark-card border-gray-800 shadow-lg mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-xl">My Registered Tournaments</CardTitle>
            <Link href="/tournaments" className="inline-block">
              <Button variant="link" className="text-accent hover:text-accent/80 p-0 h-auto">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <TournamentList showRegisteredOnly={true} limit={3} />
          </CardContent>
        </Card>

        {/* Upcoming Tournaments */}
        <Card className="bg-dark-card border-gray-800 shadow-lg mt-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-xl">Upcoming Tournaments</CardTitle>
            <Link href="/tournaments" className="inline-block">
              <Button variant="link" className="text-accent hover:text-accent/80 p-0 h-auto">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <TournamentList filter="upcoming" limit={3} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}