import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TournamentCard } from "@/components/ui/tournament-card";
import { Button } from "@/components/ui/button";
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
import { Tournament, Team, Registration } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TournamentListProps = {
  filter?: 'upcoming' | 'live' | 'completed';
  showRegisteredOnly?: boolean;
  limit?: number;
};

export function TournamentList({ filter, showRegisteredOnly = false, limit }: TournamentListProps) {
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tournaments
  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery<Tournament[]>({
    queryKey: [filter ? `/api/tournaments?status=${filter}` : "/api/tournaments"],
  });

  // Fetch user's teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
  });

  // Fetch user's registrations
  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery<any[]>({
    queryKey: ["/api/registrations/user"],
    enabled: showRegisteredOnly,
  });
  
  // Fetch registration counts for all tournaments
  const { data: registrationCounts, isLoading: isLoadingCounts } = useQuery<Record<number, number>>({
    queryKey: ["/api/registrations/counts"],
    // Create a fallback when API is not available or returns no data
    select: (data) => data || {},
  });

  const registerMutation = useMutation({
    mutationFn: async ({ tournamentId, teamId }: { tournamentId: number; teamId: number }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/register`, { teamId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/user"] });
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

  const handleRegister = (tournamentId: number) => {
    const tournament = tournaments?.find(t => t.id === tournamentId);
    if (!tournament) return;

    setSelectedTournament(tournament);

    if (!teams || teams.length === 0) {
      toast({
        title: "No teams found",
        description: "You need to create a team before registering for a tournament",
        variant: "destructive",
      });
      return;
    }

    setSelectedTeamId(teams[0].id.toString());
    setRegisterDialogOpen(true);
  };

  const confirmRegistration = () => {
    if (!selectedTournament || !selectedTeamId) return;
    registerMutation.mutate({
      tournamentId: selectedTournament.id,
      teamId: parseInt(selectedTeamId),
    });
  };

  const isRegistered = (tournamentId: number) => {
    if (!registrations) return false;
    return registrations.some((reg: any) => reg.tournamentId === tournamentId);
  };

  if (isLoadingTournaments || (showRegisteredOnly && isLoadingRegistrations) || isLoadingCounts) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">Loading tournaments...</p>
      </div>
    );
  }

  let displayTournaments = tournaments || [];

  if (showRegisteredOnly && registrations) {
    // Filter tournaments that the user has registered for
    const registeredTournamentIds = registrations.map((reg: any) => reg.tournamentId);
    displayTournaments = displayTournaments.filter(t => registeredTournamentIds.includes(t.id));
  }

  // Limit number of tournaments if specified
  if (limit && displayTournaments.length > limit) {
    displayTournaments = displayTournaments.slice(0, limit);
  }

  if (displayTournaments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">
          {showRegisteredOnly
            ? "You haven't registered for any tournaments yet"
            : "No tournaments available at the moment"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            onRegister={handleRegister}
            registered={isRegistered(tournament.id)}
            registrationsCount={registrationCounts?.[tournament.id] || 0}
          />
        ))}
      </div>

      {/* Registration Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Register for Tournament</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a team to register for {selectedTournament?.title}
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
                <span className="block">Map: {selectedTournament?.mapType}</span>
                <span className="block">Team Type: {selectedTournament?.teamType}</span>
                <span className="block">
                  Entry Fee: {selectedTournament?.isPaid 
                    ? `₹${selectedTournament.entryFee}` 
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
    </>
  );
}

export function TournamentListWithTabs() {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="mb-6 bg-dark-surface border border-gray-800">
        <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
          All
        </TabsTrigger>
        <TabsTrigger value="live" className="data-[state=active]:bg-primary data-[state=active]:text-white">
          Live
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">
          Upcoming
        </TabsTrigger>
        <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-white">
          Completed
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="all" className="mt-0">
        <TournamentList />
      </TabsContent>
      
      <TabsContent value="live" className="mt-0">
        <TournamentList filter="live" />
      </TabsContent>
      
      <TabsContent value="upcoming" className="mt-0">
        <TournamentList filter="upcoming" />
      </TabsContent>
      
      <TabsContent value="completed" className="mt-0">
        <TournamentList filter="completed" />
      </TabsContent>
    </Tabs>
  );
}
