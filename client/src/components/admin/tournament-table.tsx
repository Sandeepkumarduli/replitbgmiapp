import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tournament } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Pencil, MoreVertical, Trash2, Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function TournamentTable() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);

  // Fetch tournaments
  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    select: (data) => Array.isArray(data) ? data : []
  });

  // Delete tournament mutation
  const deleteTournamentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/tournaments/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete tournament");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tournament deleted",
        description: "The tournament has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      setDeleteDialogOpen(false);
      setTournamentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete tournament",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter tournaments based on search and status filter
  const filteredTournaments = tournaments
    .filter((tournament) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          tournament.title.toLowerCase().includes(searchLower) ||
          tournament.description.toLowerCase().includes(searchLower) ||
          tournament.gameType.toLowerCase().includes(searchLower) ||
          tournament.mapType.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter((tournament) => {
      // Status filter
      if (statusFilter) {
        return tournament.status === statusFilter;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by date, newest first
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

  const handleDeleteClick = (tournament: Tournament) => {
    setTournamentToDelete(tournament);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tournamentToDelete) {
      deleteTournamentMutation.mutate(tournamentToDelete.id);
    }
  };

  // Status badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-700/30">Upcoming</Badge>;
      case "live":
        return <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-700/30">Live</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-gray-800/40 text-gray-400 border-gray-700/30">Completed</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-800/40 text-gray-400 border-gray-700/30">{status}</Badge>;
    }
  };

  // Game mode display
  const getGameModeDisplay = (tournament: Tournament) => {
    const { gameType, gameMode } = tournament;
    return (
      <div className="flex flex-col">
        <span className="font-medium text-white">{gameType}</span>
        <span className="text-xs text-gray-400">{gameMode}</span>
      </div>
    );
  };

  if (isLoading) {
    return <div className="py-4 text-center text-gray-400">Loading tournaments...</div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="py-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Tournaments</h3>
        <p className="text-gray-400 mb-6">There are no tournaments created yet.</p>
        <Button
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => navigate("/admin/tournaments/create")}
        >
          Create Your First Tournament
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search tournaments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-dark-surface border-gray-700 text-white"
        />
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === null ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className={statusFilter === null ? "bg-primary/20 text-primary border-primary/30" : "border-gray-700 text-gray-400"}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "upcoming" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("upcoming")}
            className={statusFilter === "upcoming" ? "bg-blue-900/20 text-blue-400 border-blue-700/30" : "border-gray-700 text-gray-400"}
          >
            Upcoming
          </Button>
          <Button
            variant={statusFilter === "live" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("live")}
            className={statusFilter === "live" ? "bg-green-900/20 text-green-400 border-green-700/30" : "border-gray-700 text-gray-400"}
          >
            Live
          </Button>
          <Button
            variant={statusFilter === "completed" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
            className={statusFilter === "completed" ? "bg-gray-800/40 text-gray-400 border-gray-700/30" : "border-gray-700 text-gray-400"}
          >
            Completed
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-dark-surface">
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400 w-[300px]">Tournament</TableHead>
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Game</TableHead>
              <TableHead className="text-gray-400">Slots</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTournaments.map((tournament) => (
              <TableRow key={tournament.id} className="border-gray-800 hover:bg-dark-surface/60">
                <TableCell className="font-medium text-white">
                  <div className="flex flex-col">
                    <span>{tournament.title}</span>
                    <span className="text-xs text-gray-400 truncate max-w-xs">
                      {tournament.description.length > 60
                        ? `${tournament.description.substring(0, 60)}...`
                        : tournament.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-300">
                  <div className="flex flex-col">
                    <span>{format(new Date(tournament.date), "MMM dd, yyyy")}</span>
                    <span className="text-xs text-gray-400">{format(new Date(tournament.date), "h:mm a")}</span>
                  </div>
                </TableCell>
                <TableCell>{getGameModeDisplay(tournament)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-gray-300">{tournament.slots}</span>
                    <span className="text-xs text-gray-400">
                      {tournament.isPaid ? `₹${tournament.entryFee} entry` : 'Free entry'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(tournament.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-dark-surface"
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-dark-card border-gray-700 text-white">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      <DropdownMenuItem
                        className="text-gray-200 focus:bg-dark-surface focus:text-white cursor-pointer"
                        onClick={() => navigate(`/admin/tournaments/${tournament.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4 text-gray-400" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-gray-200 focus:bg-dark-surface focus:text-white cursor-pointer"
                        onClick={() => navigate(`/admin/tournaments/${tournament.id}/edit`)}
                      >
                        <Pencil className="mr-2 h-4 w-4 text-blue-400" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 focus:bg-red-950 focus:text-red-400 cursor-pointer"
                        onClick={() => handleDeleteClick(tournament)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Tournament
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-white">
                {tournamentToDelete?.title}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              This will permanently delete the tournament, all registrations, and related data.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTournamentMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteTournamentMutation.isPending ? "Deleting..." : "Delete Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}