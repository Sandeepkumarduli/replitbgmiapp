import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tournament, Team, Registration } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Calendar,
  Map,
  Users,
  Coins,
  Clock,
  Info,
  Key,
  AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function TournamentDetails({ params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id);
  const { isAuthenticated, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Fetch tournament details
  const { data: tournament, isLoading: isTournamentLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
  });

  // Fetch user's teams if authenticated
  const { data: teams, isLoading: isTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated,
  });

  // Fetch tournament registrations
  const { data: registrations, isLoading: isRegistrationsLoading } = useQuery<any[]>({
    queryKey: [`/api/tournaments/${tournamentId}/registrations`],
  });

  // Fetch user's registrations to check if already registered
  const { data: userRegistrations, isLoading: isUserRegistrationsLoading } = useQuery<any[]>({
    queryKey: ["/api/registrations/user"],
    enabled: isAuthenticated,
  });

  const registerMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/register`, { teamId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}/registrations`] });
      toast({
        title: "Registration successful",
        description: "You have successfully registered for the tournament",
      });
      setRegisterDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegister = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "You need to login and create a team to register",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!teams || teams.length === 0) {
      toast({
        title: "No teams found",
        description: "You need to create a team before registering for a tournament",
        variant: "destructive",
      });
      navigate("/user/team");
      return;
    }

    setSelectedTeamId(teams[0].id.toString());
    setRegisterDialogOpen(true);
  };

  const confirmRegistration = () => {
    if (!selectedTeamId) return;
    registerMutation.mutate(parseInt(selectedTeamId));
  };

  const isRegistered = () => {
    if (!userRegistrations || !tournament) return false;
    return userRegistrations.some((reg: any) => reg.tournamentId === tournament.id);
  };

  if (isTournamentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading tournament details...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h2>
          <p className="text-gray-400 mb-6">The tournament you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/tournaments")} className="bg-primary hover:bg-primary/90 text-white">
            View All Tournaments
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-[#00CC66]/20 text-[#00CC66] hover:bg-[#00CC66]/30 hover:text-[#00CC66]"><span className="status-indicator status-live"></span>Live</Badge>;
      case "upcoming":
        return <Badge className="bg-[#FFCC00]/20 text-[#FFCC00] hover:bg-[#FFCC00]/30 hover:text-[#FFCC00]"><span className="status-indicator status-upcoming"></span>Upcoming</Badge>;
      case "completed":
        return <Badge className="bg-[#FF3300]/20 text-[#FF3300] hover:bg-[#FF3300]/30 hover:text-[#FF3300]"><span className="status-indicator status-closed"></span>Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{tournament.title}</h1>
            {getStatusBadge(tournament.status)}
          </div>
          <p className="text-gray-400 max-w-3xl">{tournament.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tournament Info */}
          <div className="lg:col-span-2">
            <Card className="bg-dark-card border-gray-800 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Trophy className="mr-2 h-5 w-5 text-primary" />
                  Tournament Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-secondary mr-4" />
                    <div>
                      <h3 className="text-white text-sm font-medium">Date & Time</h3>
                      <p className="text-gray-400">
                        {format(parseISO(tournament.date.toString()), "MMM d, yyyy")} at {format(parseISO(tournament.date.toString()), "h:mm a")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Map className="h-8 w-8 text-accent mr-4" />
                    <div>
                      <h3 className="text-white text-sm font-medium">Map</h3>
                      <p className="text-gray-400">{tournament.mapType}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-primary mr-4" />
                    <div>
                      <h3 className="text-white text-sm font-medium">Team Type</h3>
                      <p className="text-gray-400">{tournament.teamType}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Coins className="h-8 w-8 text-secondary mr-4" />
                    <div>
                      <h3 className="text-white text-sm font-medium">Entry Fee</h3>
                      <p className="text-gray-400">
                        {tournament.isPaid ? `₹${tournament.entryFee}` : "Free Entry"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Trophy className="h-8 w-8 text-accent mr-4" />
                    <div>
                      <h3 className="text-white text-sm font-medium">Prize Pool</h3>
                      <p className="text-gray-400">₹{tournament.prizePool}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-primary mr-4" />
                    <div>
                      <h3 className="text-white text-sm font-medium">Slots</h3>
                      <p className="text-gray-400">
                        {registrations ? registrations.length : "0"}/{tournament.totalSlots} Filled
                      </p>
                    </div>
                  </div>
                </div>

                {tournament.status === "live" && tournament.roomId && tournament.password && (
                  <div className="mt-8 p-4 bg-dark-surface border border-gray-700 rounded-lg">
                    <h3 className="text-white font-medium flex items-center mb-4">
                      <Key className="h-5 w-5 mr-2 text-primary" />
                      Room Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Room ID</p>
                        <p className="text-white bg-dark-card px-3 py-2 rounded-md">{tournament.roomId}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Password</p>
                        <p className="text-white bg-dark-card px-3 py-2 rounded-md">{tournament.password}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  {isRegistered() ? (
                    <Button disabled className="bg-gray-700 text-white">
                      Already Registered
                    </Button>
                  ) : tournament.status === "completed" ? (
                    <Button disabled className="bg-gray-700 text-white">
                      Tournament Completed
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleRegister} 
                      className="bg-primary hover:bg-primary/90 text-white"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Processing..." : "Register for Tournament"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rules & Info */}
            <Card className="bg-dark-card border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Info className="mr-2 h-5 w-5 text-primary" />
                  Rules & Information
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <div className="text-gray-300">
                  <h3 className="text-white text-lg font-medium mb-4">Tournament Rules</h3>
                  
                  <ul className="list-disc pl-5 space-y-2 text-gray-300">
                    <li>All participants must have a valid BGMI account</li>
                    <li>Teams must check in 30 minutes before the match starts</li>
                    <li>Use of emulators, triggers, or any other unauthorized accessories is prohibited</li>
                    <li>Any form of teaming with other players or teams will result in disqualification</li>
                    <li>Tournament officials have the final say in all disputes</li>
                  </ul>
                  
                  <h3 className="text-white text-lg font-medium mt-6 mb-4">Scoring System</h3>
                  
                  <ul className="list-disc pl-5 space-y-2 text-gray-300">
                    <li>Chicken Dinner: 20 points</li>
                    <li>2nd Place: 14 points</li>
                    <li>3rd Place: 10 points</li>
                    <li>4th to 10th Place: 7-1 points (descending)</li>
                    <li>Each Kill: 1 point</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Registrations */}
          <div>
            <Card className="bg-dark-card border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white">Registered Teams</CardTitle>
                <Badge variant="outline" className="text-gray-400 bg-dark-surface">
                  {registrations ? registrations.length : "0"}/{tournament.totalSlots}
                </Badge>
              </CardHeader>
              <CardContent>
                {isRegistrationsLoading ? (
                  <p className="text-gray-400 text-center py-4">Loading registrations...</p>
                ) : registrations && registrations.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {registrations.map((registration: any, index) => (
                      <div 
                        key={registration.id} 
                        className="bg-dark-surface p-3 rounded-lg border border-gray-800 flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                            <span className="font-bold">{registration.slot || index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{registration.team?.name || "Team"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No teams registered yet</p>
                    <p className="text-gray-500 text-sm mt-1">Be the first to join!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Register for Tournament</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a team to register for {tournament.title}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Select Team</label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-dark-card border-gray-700">
                  {teams?.map((team) => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id.toString()}
                      className="text-white focus:bg-dark-surface focus:text-white"
                    >
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 p-3 bg-dark-surface border border-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-white mb-2">Tournament Info</h4>
              <p className="text-sm text-gray-400">
                <span className="block">Map: {tournament.mapType}</span>
                <span className="block">Team Type: {tournament.teamType}</span>
                <span className="block">
                  Entry Fee: {tournament.isPaid 
                    ? `₹${tournament.entryFee}` 
                    : "Free"}
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegisterDialogOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRegistration}
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={registerMutation.isPending || !selectedTeamId}
            >
              {registerMutation.isPending ? "Registering..." : "Confirm Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
