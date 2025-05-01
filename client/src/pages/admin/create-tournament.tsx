import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { TournamentForm } from "@/components/admin/create-tournament-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function CreateTournament() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-white mb-8">Create Tournament</h1>

      <Card className="bg-dark-card border-gray-800">
        <CardHeader className="flex flex-row items-center border-b border-gray-800 pb-4">
          <Trophy className="h-6 w-6 text-primary mr-3" />
          <CardTitle className="text-white text-xl">Tournament Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <TournamentForm />
        </CardContent>
      </Card>
    </div>
  );
}
