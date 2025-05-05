import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { 
  Trophy,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Key,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Filter
} from "lucide-react";
import { Tournament } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TournamentTable() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomData, setRoomData] = useState({ roomId: "", password: "" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  // Game types for filtering
  const gameTypes = ["BGMI", "FREEFIRE", "COD"];
  
  // Status types for filtering
  const statusTypes = ["live", "upcoming", "completed"];

  // Set default filter to show live and upcoming tournaments
  const [defaultStatusFilter, setDefaultStatusFilter] = useState<string | null>("live-upcoming");

  const { data: tournaments = [], isLoading, refetch } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    select: (data) => Array.isArray(data) ? data : []
  });
  
  const { data: registrationCounts = {} as Record<string, number> } = useQuery<Record<string, number>>({
    queryKey: ["/api/registrations/counts"],
  });
  
  // Apply all filters to tournaments
  const filteredTournaments = tournaments ? 
    tournaments.filter(t => {
      // Apply game type filter
      if (gameFilter && t.gameType !== gameFilter) return false;
      
      // Apply status filter
      if (statusFilter && t.status !== statusFilter) return false;
      
      // Apply special combined filter for live and upcoming
      if (!statusFilter && defaultStatusFilter === "live-upcoming" && t.status === "completed") {
        return false;
      }
      
      // Apply date filter
      if (dateFilter) {
        const tournamentDate = new Date(t.date);
        // Format both dates to same format to compare only the date part (not time)
        const filterDateStr = dateFilter.toISOString().split('T')[0];
        const tournamentDateStr = tournamentDate.toISOString().split('T')[0];
        if (filterDateStr !== tournamentDateStr) return false;
      }
      
      return true;
    }) : 
    [];
    
  // Sort tournaments to prioritize Live, then Upcoming, then Completed
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    const statusPriority = { live: 0, upcoming: 1, completed: 2 };
    return statusPriority[a.status as keyof typeof statusPriority] - statusPriority[b.status as keyof typeof statusPriority];
  });
  
  const refreshTournaments = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Tournaments refreshed",
        description: "The tournament list has been refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Failed to refresh tournaments",
        description: "There was an error refreshing the tournament list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateRoomMutation = useMutation({
    mutationFn: async (tournamentId: number) => {
      const res = await apiRequest("PATCH", `/api/tournaments/${tournamentId}`, {
        roomId: roomData.roomId,
        password: roomData.password
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Room details updated",
        description: "The room ID and password have been updated successfully",
      });
      setIsRoomDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update room details",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (tournamentId: number) => {
      const res = await apiRequest("DELETE", `/api/tournaments/${tournamentId}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament deleted",
        description: "The tournament has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tournament",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const openRoomDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setRoomData({
      roomId: tournament.roomId || "",
      password: tournament.password || ""
    });
    setIsRoomDialogOpen(true);
  };

  const openDeleteDialog = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsDeleteDialogOpen(true);
  };

  const updateRoomDetails = () => {
    if (selectedTournament) {
      updateRoomMutation.mutate(selectedTournament.id);
    }
  };

  const deleteTournament = () => {
    if (selectedTournament) {
      deleteTournamentMutation.mutate(selectedTournament.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00CC66]/20 text-[#00CC66]"><span className="status-indicator status-live mr-1"></span>Live</span>;
      case "upcoming":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFCC00]/20 text-[#FFCC00]"><span className="status-indicator status-upcoming mr-1"></span>Upcoming</span>;
      case "completed":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF3300]/20 text-[#FF3300]"><span className="status-indicator status-closed mr-1"></span>Completed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">Unknown</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-8 flex justify-center">
        <p className="text-white">Loading tournaments...</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-gray-800 bg-dark-card">
        <div className="p-4 flex justify-between items-center">
          <h3 className="text-white text-lg font-medium flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-primary" />
            Tournaments
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-white border-gray-700 hover:bg-primary/20 hover:text-white"
              onClick={refreshTournaments}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white glow-hover"
              onClick={() => navigate("/admin/tournaments/create")}
            >
              Add New
            </Button>
          </div>
        </div>
        
        {/* Filters Section */}
        <div className="px-4 pb-4">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            {/* Game filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-400">Game:</span>
              <div className="flex gap-1">
                {gameTypes.map(game => (
                  <Button
                    key={game}
                    size="sm"
                    variant={gameFilter === game ? "default" : "outline"}
                    className={`text-xs h-7 px-2 ${
                      gameFilter === game 
                        ? `${game === 'BGMI' 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : game === 'FREEFIRE' 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-green-600 hover:bg-green-700'}`
                        : "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                    }`}
                    onClick={() => gameFilter === game ? setGameFilter(null) : setGameFilter(game)}
                  >
                    {game}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Status filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-400">Status:</span>
              <div className="flex gap-1">
                {statusTypes.map(status => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    className={`text-xs h-7 px-2 ${
                      statusFilter === status 
                        ? `${status === 'live' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : status === 'upcoming' 
                              ? 'bg-amber-600 hover:bg-amber-700' 
                              : 'bg-gray-600 hover:bg-gray-700'}`
                        : "bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                    }`}
                    onClick={() => statusFilter === status ? setStatusFilter(null) : setStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Date filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-400">Date:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs h-7 px-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 ${
                      dateFilter ? 'bg-primary/20 border-primary text-primary' : ''
                    }`}
                  >
                    <Calendar className="mr-2 h-3 w-3" />
                    {dateFilter ? format(dateFilter, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-dark-card border-gray-800">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    className="bg-dark-card text-white border-none"
                  />
                </PopoverContent>
              </Popover>
              
              {dateFilter && (
                <Button 
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => setDateFilter(undefined)}
                >
                  Clear
                </Button>
              )}
            </div>
            
            {/* Clear all filters */}
            {(gameFilter || statusFilter || dateFilter) && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 ml-auto"
                onClick={() => {
                  setGameFilter(null);
                  setStatusFilter(null);
                  setDateFilter(undefined);
                }}
              >
                <Filter className="mr-2 h-3 w-3" />
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
        
        <Table>
          <TableHeader className="bg-dark-surface">
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400 w-[250px]">Title</TableHead>
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Game</TableHead>
              <TableHead className="text-gray-400">Type</TableHead>
              <TableHead className="text-gray-400">Map</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Registrations</TableHead>
              <TableHead className="text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTournaments && sortedTournaments.length > 0 ? (
              sortedTournaments.map((tournament) => (
                <TableRow key={tournament.id} className="border-gray-800 hover:bg-dark-surface/50">
                  <TableCell className="font-medium text-white">{tournament.title}</TableCell>
                  <TableCell className="text-gray-300">
                    {format(parseISO(tournament.date.toString()), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tournament.gameType === 'BGMI' 
                        ? 'bg-blue-600/20 text-blue-400'
                        : tournament.gameType === 'FREEFIRE'
                          ? 'bg-red-600/20 text-red-400'
                          : 'bg-green-600/20 text-green-400'
                    }`}>
                      {tournament.gameType}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-300">{tournament.teamType}</TableCell>
                  <TableCell className="text-gray-300">{tournament.mapType}</TableCell>
                  <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                  <TableCell className="text-gray-300">
                    {registrationCounts[tournament.id] || 0}/{tournament.totalSlots}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-dark-card border-gray-800">
                        <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-800" />
                        <DropdownMenuItem 
                          className="text-gray-300 hover:text-white focus:text-white focus:bg-dark-surface cursor-pointer"
                          onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-gray-300 hover:text-white focus:text-white focus:bg-dark-surface cursor-pointer"
                          onClick={() => navigate(`/admin/tournaments/edit/${tournament.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-gray-300 hover:text-white focus:text-white focus:bg-dark-surface cursor-pointer"
                          onClick={() => openRoomDialog(tournament)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Update Room Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-500 hover:text-red-400 focus:text-red-400 focus:bg-dark-surface cursor-pointer"
                          onClick={() => openDeleteDialog(tournament)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  No tournaments found. Create your first tournament.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Room Details Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Update Room Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the room ID and password for the tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Room ID</label>
              <Input
                value={roomData.roomId}
                onChange={(e) => setRoomData({ ...roomData, roomId: e.target.value })}
                placeholder="Enter room ID"
                className="bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <Input
                value={roomData.password}
                onChange={(e) => setRoomData({ ...roomData, password: e.target.value })}
                placeholder="Enter password"
                className="bg-dark-surface border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRoomDialogOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button 
              onClick={updateRoomDetails} 
              className="bg-primary hover:bg-primary/90"
              disabled={updateRoomMutation.isPending}
            >
              {updateRoomMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Tournament
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this tournament? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteTournament}
              disabled={deleteTournamentMutation.isPending}
            >
              {deleteTournamentMutation.isPending ? "Deleting..." : "Delete Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
