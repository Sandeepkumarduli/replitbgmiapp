import { useState, useEffect } from "react";
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
  gameTypeFilter?: 'BGMI' | 'COD' | 'FREEFIRE' | null;
  searchTerm?: string;
};

export function TournamentList({ 
  filter, 
  showRegisteredOnly = false, 
  limit, 
  gameTypeFilter = null,
  searchTerm = ""
}: TournamentListProps) {
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tournaments with proper error handling
  const { 
    data: tournaments = [], // Default to empty array if no data
    isLoading: isLoadingTournaments,
    error: tournamentsError,
    refetch: refetchTournaments
  } = useQuery<Tournament[]>({
    queryKey: [filter ? `/api/tournaments?status=${filter}` : "/api/tournaments"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2, // Try up to 3 times total (initial + 2 retries)
  });
  
  // Immediately refetch once on component mount to ensure fresh data
  useEffect(() => {
    const fetchData = async () => {
      try {
        await refetchTournaments();
      } catch (error) {
        // Silently catch the error to avoid unhandled rejection
        console.log("Refetch cancelled or failed silently");
      }
    };
    
    fetchData();
  }, []);

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

  const confirmRegistration = async () => {
    if (!selectedTournament || !selectedTeamId) return;
    
    const teamId = parseInt(selectedTeamId);
    const tournamentType = selectedTournament.teamType?.toLowerCase() || 'squad';
    
    // For Solo tournaments, we can proceed directly
    if (tournamentType === 'solo') {
      registerMutation.mutate({
        tournamentId: selectedTournament.id,
        teamId
      });
      return;
    }
    
    // For Squad and Duo tournaments, validate team size
    try {
      // Fetch team members to check team size
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (!res.ok) throw new Error('Failed to fetch team members');
      
      const teamMembers = await res.json();
      
      // Validate team size based on tournament type
      if (tournamentType === 'squad' && teamMembers.length < 4) {
        toast({
          title: 'Invalid Team Size',
          description: `Squad tournaments require at least 4 team members. Your team has ${teamMembers.length}.`,
          variant: 'destructive'
        });
        return;
      } else if (tournamentType === 'duo' && teamMembers.length < 2) {
        toast({
          title: 'Invalid Team Size',
          description: `Duo tournaments require at least 2 team members. Your team has ${teamMembers.length}.`,
          variant: 'destructive'
        });
        return;
      }
      
      // If validation passes, proceed with registration
      registerMutation.mutate({
        tournamentId: selectedTournament.id,
        teamId
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to validate team',
        variant: 'destructive'
      });
    }
  };

  const isRegistered = (tournamentId: number) => {
    if (!registrations) return false;
    return registrations.some((reg: any) => reg.tournamentId === tournamentId);
  };

  // Handle API errors gracefully
  if (tournamentsError) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-400">Error loading tournaments. Please try again.</p>
        <Button 
          onClick={() => refetchTournaments()}
          className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
        >
          Retry
        </Button>
      </div>
    );
  }

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

  // Apply game type filter if specified
  if (gameTypeFilter) {
    displayTournaments = displayTournaments.filter(t => t.gameType === gameTypeFilter);
  }
  
  // Apply search filter if specified
  if (searchTerm.trim()) {
    const lowercaseSearch = searchTerm.toLowerCase().trim();
    displayTournaments = displayTournaments.filter(t => 
      t.title.toLowerCase().includes(lowercaseSearch) || 
      (t.description && t.description.toLowerCase().includes(lowercaseSearch)) ||
      t.mapType.toLowerCase().includes(lowercaseSearch) ||
      t.teamType.toLowerCase().includes(lowercaseSearch) ||
      (t.gameType && t.gameType.toLowerCase().includes(lowercaseSearch))
    );
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
      <div className={`grid grid-cols-1 ${showRegisteredOnly ? "" : "sm:grid-cols-2 lg:grid-cols-3"} gap-6`}>
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
                {selectedTournament?.teamType && (
                  <span className="block mt-2 font-medium text-amber-400">
                    {selectedTournament.teamType.toLowerCase() === 'squad' 
                      ? '⚠️ Squad tournaments require at least 4 team members'
                      : selectedTournament.teamType.toLowerCase() === 'duo'
                        ? '⚠️ Duo tournaments require at least 2 team members'
                        : '✓ Solo tournaments don\'t require team members'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegisterDialogOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface bg-gradient-to-r from-gray-900/30 to-slate-900/30"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRegistration}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
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

type TournamentListWithTabsProps = {
  gameTypeFilter?: 'BGMI' | 'COD' | 'FREEFIRE' | null;
  searchTerm?: string;
};

export function TournamentListWithTabs({ gameTypeFilter = null, searchTerm = "" }: TournamentListWithTabsProps) {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="mb-6 bg-dark-surface border border-gray-800">
        <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
          All
        </TabsTrigger>
        <TabsTrigger value="live" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
          Live
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white">
          Upcoming
        </TabsTrigger>
        <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white">
          Completed
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="all" className="mt-0">
        <TournamentList gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} />
      </TabsContent>
      
      <TabsContent value="live" className="mt-0">
        <TournamentList filter="live" gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} />
      </TabsContent>
      
      <TabsContent value="upcoming" className="mt-0">
        <TournamentList filter="upcoming" gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} />
      </TabsContent>
      
      <TabsContent value="completed" className="mt-0">
        <TournamentList filter="completed" gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} />
      </TabsContent>
    </Tabs>
  );
}
