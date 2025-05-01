import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentTable } from "@/components/admin/tournament-table";
import { Tournament } from "@shared/schema";
import { Trophy, Users, Calendar, TrendingUp, CalendarPlus } from "lucide-react";

export default function AdminDashboard() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  // Calculate stats
  const liveTournaments = tournaments?.filter(t => t.status === "live").length || 0;
  const upcomingTournaments = tournaments?.filter(t => t.status === "upcoming").length || 0;
  const totalRegistrations = Math.floor(Math.random() * 1000); // This would be fetched from actual data

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">Admin Dashboard</h1>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => navigate("/admin/tournaments/create")}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Create Tournament
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-dark-card border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">Total Tournaments</CardTitle>
            <Trophy className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{tournaments?.length || 0}</p>
            <p className="text-gray-400 text-sm">All-time tournaments</p>
          </CardContent>
        </Card>

        <Card className="bg-dark-card border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">Live Tournaments</CardTitle>
            <TrendingUp className="h-5 w-5 text-[#00CC66]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{liveTournaments}</p>
            <p className="text-gray-400 text-sm">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-dark-card border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">Upcoming Tournaments</CardTitle>
            <Calendar className="h-5 w-5 text-[#FFCC00]" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{upcomingTournaments}</p>
            <p className="text-gray-400 text-sm">Scheduled tournaments</p>
          </CardContent>
        </Card>
      </div>

      {/* Tournament Table */}
      <TournamentTable />
    </div>
  );
}
