import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { TournamentForm } from "@/components/admin/create-tournament-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tournament } from "@shared/schema";
import { Trophy } from "lucide-react";

export default function EditTournament({ params }: { params?: { id?: string } }) {
  const tournamentId = params?.id ? parseInt(params.id) : 0;
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournament, isLoading: isTournamentLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !isLoading && isAuthenticated && isAdmin,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  if (isLoading || isTournamentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">Tournament not found</p>
          <Button 
            onClick={() => navigate("/admin/dashboard")} 
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-white mb-8">Edit Tournament</h1>

      <Card className="bg-dark-card border-gray-800">
        <CardHeader className="flex flex-row items-center border-b border-gray-800 pb-4">
          <Trophy className="h-6 w-6 text-primary mr-3" />
          <CardTitle className="text-white text-xl">Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <TournamentForm tournament={tournament} isEditing />
        </CardContent>
      </Card>
    </div>
  );
}
