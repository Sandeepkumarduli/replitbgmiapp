import { TournamentTable } from "@/components/admin/tournament-table";
import AdminLayout from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Tournament } from "@shared/schema";
import { Plus, Users, Calendar, Flame, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AdminTournaments() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    select: (data) => Array.isArray(data) ? data : []
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
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

  const upcomingCount = tournaments?.filter(t => t.status === "upcoming").length || 0;
  const liveCount = tournaments?.filter(t => t.status === "live").length || 0;
  const completedCount = tournaments?.filter(t => t.status === "completed").length || 0;

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">Tournament Management</h1>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => navigate("/admin/tournaments/create")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Tournament
          </Button>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-dark-card border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-lg">Upcoming</CardTitle>
              <Calendar className="h-5 w-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{upcomingCount}</p>
              <p className="text-gray-400 text-sm">Scheduled tournaments</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-card border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-lg">Live</CardTitle>
              <Flame className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{liveCount}</p>
              <p className="text-gray-400 text-sm">Currently active</p>
            </CardContent>
          </Card>
          
          <Card className="bg-dark-card border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-lg">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{completedCount}</p>
              <p className="text-gray-400 text-sm">Finished tournaments</p>
            </CardContent>
          </Card>
        </div>

        {/* Tournament Table */}
        <div className="bg-dark-card rounded-md border border-gray-800 p-6">
          <TournamentTable />
        </div>
      </div>
    </AdminLayout>
  );
}