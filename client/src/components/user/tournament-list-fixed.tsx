import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TournamentCard } from "@/components/ui/tournament-card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type Tournament = {
  id: number;
  title: string;
  description?: string;
  date: string;
  status: string;
  teamType: string;
  mapType: string;
  totalSlots: number;
  slotsTaken: number;
  entryFee: number;
  isPaid: boolean;
  prizePool?: number;
  roomId?: string;
  password?: string;
  gameType?: string;
};

type Team = {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
};

type TournamentListProps = {
  filter?: 'upcoming' | 'live' | 'completed';
  showRegisteredOnly?: boolean;
  limit?: number;
  gameTypeFilter?: 'BGMI' | 'COD' | 'FREEFIRE' | null;
  searchTerm?: string;
  dateFilter?: Date;
};

export function TournamentList({ 
  filter, 
  showRegisteredOnly = false, 
  limit, 
  gameTypeFilter = null,
  searchTerm = "",
  dateFilter
}: TournamentListProps) {
  // Standard page size for pagination
  const PAGE_SIZE = 10;
  
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isJustRegistered, setIsJustRegistered] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tournaments with proper error handling
  const { 
    data: tournaments = [], 
    isLoading: isLoadingTournaments,
    error: tournamentsError,
    refetch: refetchTournaments
  } = useQuery<Tournament[]>({
    queryKey: [filter ? `/api/tournaments?status=${filter}` : "/api/tournaments"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });
  
  // Fetch user's teams
  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
  });

  // Fetch user's registrations
  const { data: registrations } = useQuery<any[]>({
    queryKey: ["/api/registrations/user"],
  });
  
  // Fetch registration counts for all tournaments
  const { data: registrationCounts = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/registrations/counts"],
    select: (data) => data || {},
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check if a tournament is registered
  const isRegistered = (tournamentId: number) => {
    if (isJustRegistered.includes(tournamentId)) return true;
    if (!registrations) return false;
    return registrations.some((reg: any) => reg.tournamentId === tournamentId);
  };

  // Reset to first page if current page is out of bounds
  useEffect(() => {
    const processedTournaments = processDisplayTournaments();
    const totalPages = Math.ceil(processedTournaments.length / PAGE_SIZE);
    
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [tournaments, filter, gameTypeFilter, searchTerm, showRegisteredOnly, registrations]);

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async ({ tournamentId, teamId }: { tournamentId: number; teamId: number }) => {
      try {
        const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/register`, { teamId });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to register for tournament");
        }
        return await res.json();
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      
      if (filter) {
        queryClient.invalidateQueries({ queryKey: [`/api/tournaments?status=${filter}`] });
      }
      
      toast({
        title: "Registration successful",
        description: "You have successfully registered for the tournament",
      });
      
      setRegisterDialogOpen(false);
      
      if (selectedTournament) {
        setIsJustRegistered(prev => [...prev, selectedTournament.id]);
      }
    },
    onError: (error: any) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Handle registration click
  const handleRegister = (tournamentId: number) => {
    const tournament = tournaments?.find(t => t.id === tournamentId);
    if (!tournament) return;

    setSelectedTournament(tournament);
    
    if (!teams) {
      toast({
        title: "Authentication Required",
        description: "You need to log in first to register for tournaments",
        variant: "destructive",
      });
      return;
    }

    // Check if teams exist
    if (teams.length === 0) {
      toast({
        title: "No teams found",
        description: "You need to create a team before registering for a tournament",
        variant: "destructive",
      });
      return;
    }

    // Check if it's a solo tournament (doesn't require team selection)
    const tournamentType = tournament.teamType?.toLowerCase() || 'squad';
    if (tournamentType === 'solo') {
      // For solo tournaments, show confirmation dialog but with team pre-selected
      setSelectedTeamId(teams[0].id.toString());
      setRegisterDialogOpen(true);
      return;
    }

    // For non-solo tournaments, show team selection dialog
    setSelectedTeamId(teams[0].id.toString());
    setRegisterDialogOpen(true);
  };

  // Confirm registration
  const confirmRegistration = async () => {
    if (!selectedTournament || !selectedTeamId) return;
    
    const teamId = parseInt(selectedTeamId);
    const tournamentType = selectedTournament.teamType?.toLowerCase() || 'squad';
    
    // For solo tournaments, directly register without team validation
    if (tournamentType === 'solo') {
      registerMutation.mutate({
        tournamentId: selectedTournament.id,
        teamId
      });
      // Dialog will be closed by the mutation's onSuccess handler
      return;
    }
    
    // For duo and squad tournaments, validate team size
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (!res.ok) throw new Error('Failed to fetch team members');
      
      const teamMembers = await res.json();
      
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
      
      registerMutation.mutate({
        tournamentId: selectedTournament.id,
        teamId
      });
      // Dialog will be closed by the mutation's onSuccess handler
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to validate team',
        variant: 'destructive'
      });
    }
  };

  // Process tournaments with all filters
  const processDisplayTournaments = () => {
    if (!tournaments) return [];
    
    let displayTournaments = [...tournaments];
    
    // Filter for user's registered tournaments
    if (showRegisteredOnly && registrations) {
      const registeredIds = registrations.map((reg: any) => reg.tournamentId);
      displayTournaments = displayTournaments.filter(t => registeredIds.includes(t.id));
    }
    
    // Special filter for completed tournaments
    if (filter === "completed" && !showRegisteredOnly) {
      if (registrations) {
        const registeredIds = registrations.map((reg: any) => reg.tournamentId);
        displayTournaments = displayTournaments.filter(t => registeredIds.includes(t.id));
      } else {
        displayTournaments = [];
      }
    }
    
    // Apply game type filter
    if (gameTypeFilter) {
      displayTournaments = displayTournaments.filter(t => t.gameType === gameTypeFilter);
    }
    
    // Apply date filter
    if (dateFilter) {
      displayTournaments = displayTournaments.filter(t => {
        const tournamentDate = new Date(t.date);
        // Format both dates to the same format to compare only the date part (not time)
        const filterDateString = dateFilter.toISOString().split('T')[0];
        const tournamentDateString = tournamentDate.toISOString().split('T')[0];
        return filterDateString === tournamentDateString;
      });
    }
    
    // Apply search filter
    if (searchTerm?.trim()) {
      const search = searchTerm.toLowerCase().trim();
      displayTournaments = displayTournaments.filter(t => 
        t.title.toLowerCase().includes(search) || 
        (t.description && t.description.toLowerCase().includes(search)) ||
        t.mapType.toLowerCase().includes(search) ||
        t.teamType.toLowerCase().includes(search) ||
        (t.gameType && t.gameType.toLowerCase().includes(search))
      );
    }
    
    // Sort tournaments by date (most recent first)
    displayTournaments.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    return displayTournaments;
  };
  
  // Get paginated tournaments
  const getPaginatedTournaments = () => {
    const displayTournaments = processDisplayTournaments();
    
    if (limit && displayTournaments.length > limit) {
      return displayTournaments.slice(0, limit);
    } 
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return displayTournaments.slice(startIndex, startIndex + PAGE_SIZE);
  };
  
  // Handle loading state
  if (isLoadingTournaments) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">Loading tournaments...</p>
      </div>
    );
  }
  
  // Handle error state
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
  
  // Get processed data
  const displayTournaments = processDisplayTournaments();
  const paginatedTournaments = getPaginatedTournaments();
  const totalPages = Math.ceil(displayTournaments.length / PAGE_SIZE);
  
  // Handle empty state
  if (displayTournaments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">
          {filter === "completed" && !registrations
            ? "Please log in to view completed tournaments. Only tournaments you registered for will be visible."
            : showRegisteredOnly
              ? "You haven't registered for any tournaments yet"
              : "No tournaments available at the moment"}
        </p>
        {filter === "completed" && !registrations && (
          <Button
            className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            onClick={() => window.location.href = "/auth"}
          >
            Log In Now
          </Button>
        )}
      </div>
    );
  }

  // Render tournaments
  return (
    <>
      <div className={`grid grid-cols-1 ${showRegisteredOnly ? "" : "sm:grid-cols-2 lg:grid-cols-3"} gap-6`}>
        {paginatedTournaments.map((tournament) => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            onRegister={handleRegister}
            registered={isRegistered(tournament.id)}
            registrationsCount={registrationCounts[tournament.id] || 0}
          />
        ))}
      </div>
      
      {/* Pagination controls */}
      {!limit && totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-gray-700 text-white hover:bg-dark-surface bg-gradient-to-r from-gray-900/30 to-slate-900/30"
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={
                  currentPage === page
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    : "border-gray-700 text-white hover:bg-dark-surface bg-gradient-to-r from-gray-900/30 to-slate-900/30"
                }
              >
                {page}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="border-gray-700 text-white hover:bg-dark-surface bg-gradient-to-r from-gray-900/30 to-slate-900/30"
          >
            Next
          </Button>
        </div>
      )}
      
      {/* Registration Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Register for Tournament</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedTournament?.teamType?.toLowerCase() === 'solo' 
                ? `Confirm registration for ${selectedTournament?.title}`
                : `Select a team to register for ${selectedTournament?.title}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Only show team selection for non-solo tournaments */}
            {selectedTournament?.teamType?.toLowerCase() !== 'solo' && (
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
            )}

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
              disabled={registerMutation.isPending || (selectedTournament?.teamType?.toLowerCase() !== 'solo' && !selectedTeamId)}
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
  dateFilter?: Date;
};

export function TournamentListWithTabs({ gameTypeFilter = null, searchTerm = "", dateFilter }: TournamentListWithTabsProps) {
  return (
    <Tabs defaultValue="upcoming" className="w-full">
      <TabsList className="mb-6 bg-dark-surface border border-gray-800">
        <TabsTrigger value="upcoming" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white">
          Upcoming
        </TabsTrigger>
        <TabsTrigger value="live" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
          Live
        </TabsTrigger>
        <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
          All
        </TabsTrigger>
        <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white">
          Completed
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="upcoming" className="mt-0">
        <TournamentList filter="upcoming" gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} dateFilter={dateFilter} />
      </TabsContent>
      
      <TabsContent value="live" className="mt-0">
        <TournamentList filter="live" gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} dateFilter={dateFilter} />
      </TabsContent>
      
      <TabsContent value="all" className="mt-0">
        <TournamentList gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} dateFilter={dateFilter} />
      </TabsContent>
      
      <TabsContent value="completed" className="mt-0">
        <TournamentList filter="completed" gameTypeFilter={gameTypeFilter} searchTerm={searchTerm} dateFilter={dateFilter} />
      </TabsContent>
    </Tabs>
  );
}