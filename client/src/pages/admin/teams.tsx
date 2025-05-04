import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layouts/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  MoreVertical, 
  Users, 
  RefreshCw, 
  UserPlus, 
  Trash, 
  Eye, 
  User,
  UserCog,
  Copy,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function AdminTeams() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    ownerId: 0, // Will be set in form
    ownerUsername: "", // For display only
    gameType: "BGMI", // Default game type
  });
  
  // Game filter state
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [teamOwners, setTeamOwners] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  const { data: teams = [], isLoading: isTeamsLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/teams"],
  });

  // Fetch users to select team owner
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });
  
  // Update teamOwners when users data changes
  useEffect(() => {
    if (users.length > 0) {
      setTeamOwners(users.filter((user: any) => user.role !== "admin"));
    }
  }, [users]);

  const refreshTeams = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Teams list refreshed",
        description: "The teams list has been refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Failed to refresh teams",
        description: "There was an error refreshing the teams list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addTeamMutation = useMutation({
    mutationFn: async (teamData: any) => {
      const res = await apiRequest("POST", "/api/admin/teams", teamData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teams"] });
      setIsAddTeamOpen(false);
      setNewTeam({ name: "", description: "", ownerId: 0, ownerUsername: "", gameType: "BGMI" });
      toast({
        title: "Team added",
        description: "The new team has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      try {
        const res = await apiRequest("DELETE", `/api/admin/teams/${teamId}`, {});
        
        // Check if the response is ok before trying to parse JSON
        if (!res.ok) {
          const errorText = await res.text();
          try {
            // Try to parse the error as JSON
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || 'Failed to delete team');
          } catch (parseError) {
            // If parsing fails, use the raw text
            throw new Error(errorText || 'Failed to delete team');
          }
        }
        
        // If we reach here, the response was successful
        // Sometimes delete operations don't return content, so handle that case
        if (res.headers.get('content-length') === '0') {
          return { success: true };
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error deleting team:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teams"] });
      toast({
        title: "Team deleted",
        description: "The team has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete team",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleAddTeam = () => {
    if (!newTeam.name || !newTeam.ownerId) {
      toast({
        title: "Missing information",
        description: "Please provide team name and owner",
        variant: "destructive",
      });
      return;
    }

    // Submit only the necessary data
    addTeamMutation.mutate({
      name: newTeam.name,
      description: newTeam.description,
      ownerId: newTeam.ownerId,
      gameType: newTeam.gameType
    });
  };

  const handleDeleteTeam = (teamId: number, teamName: string) => {
    if (confirm(`Are you sure you want to delete team ${teamName}?`)) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const handleOwnerChange = (userId: number) => {
    const selectedUser = users.find(user => user.id === parseInt(userId.toString()));
    if (selectedUser) {
      setNewTeam({
        ...newTeam,
        ownerId: userId,
        ownerUsername: selectedUser.username
      });
    }
  };

  if (isLoading || isTeamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Teams</h1>
            <p className="text-gray-400">Manage all teams and their members in the system</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-gray-700 text-white hover:bg-dark-card"
              onClick={refreshTeams}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
              onClick={() => setIsAddTeamOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add Team
            </Button>
          </div>
        </div>

        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  All Teams
                </CardTitle>
                <CardDescription className="text-gray-400">
                  View and manage teams and their members
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="gameFilter" className="text-white">Filter by Game:</Label>
                <select
                  id="gameFilter"
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="bg-dark-surface border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Games</option>
                  <option value="BGMI">BGMI</option>
                  <option value="COD">COD</option>
                  <option value="FREEFIRE">FREEFIRE</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-dark-surface">
                <TableRow className="hover:bg-dark-surface/80 border-gray-800">
                  <TableHead className="text-gray-400">Team Name</TableHead>
                  <TableHead className="text-gray-400">Game</TableHead>
                  <TableHead className="text-gray-400">Owner</TableHead>
                  <TableHead className="text-gray-400">Members</TableHead>
                  <TableHead className="text-gray-400">Invite Code</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams?.filter(team => gameFilter === "all" || team.gameType === gameFilter)
                  .map((team: any) => (
                  <TableRow key={team.id} className="hover:bg-dark-surface/50 border-gray-800">
                    <TableCell className="font-medium text-white">
                      {team.name}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        team.gameType === "BGMI" 
                          ? "bg-blue-900/50 text-blue-300 border border-blue-800" 
                          : team.gameType === "COD" 
                            ? "bg-amber-900/50 text-amber-300 border border-amber-800"
                            : "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                      }`}>
                        {team.gameType || "BGMI"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {team.ownerName || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded-full text-xs">
                        {team.memberCount || 0} members
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-300 font-mono">
                      {team.inviteCode ? (
                        <div className="flex items-center gap-1">
                          <span className="bg-indigo-950/40 text-indigo-300 px-2 py-1 rounded border border-indigo-700/30">
                            {team.inviteCode}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-indigo-400 hover:text-indigo-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(team.inviteCode);
                              toast({
                                title: "Invite code copied",
                                description: "Team invite code copied to clipboard"
                              });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : "No code"}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {team.createdAt ? format(new Date(team.createdAt), "MMM d, yyyy") : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-dark-card border-gray-700 text-white">
                          <DropdownMenuItem 
                            className="cursor-pointer hover:bg-dark-surface"
                            onClick={() => navigate(`/admin/teams/${team.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer hover:bg-dark-surface"
                            onClick={() => navigate(`/admin/teams/${team.id}/members`)}
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>Manage Members</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer hover:bg-dark-surface text-red-500"
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            <span>Delete Team</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(teams.filter(team => gameFilter === "all" || team.gameType === gameFilter).length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                      {gameFilter === "all" 
                        ? "No teams found. Create new teams to begin tournament registrations."
                        : `No ${gameFilter} teams found. Try a different filter or create a new team.`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new team with an owner and description
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teamName" className="text-right">
                Team Name
              </Label>
              <Input
                id="teamName"
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teamDescription" className="text-right">
                Description
              </Label>
              <Input
                id="teamDescription"
                value={newTeam.description}
                onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gameType" className="text-right">
                Game
              </Label>
              <select
                id="gameType"
                value={newTeam.gameType}
                onChange={(e) => setNewTeam({...newTeam, gameType: e.target.value})}
                className="col-span-3 bg-dark-surface border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="BGMI">BGMI</option>
                <option value="COD">COD</option>
                <option value="FREEFIRE">FREEFIRE</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teamOwner" className="text-right">
                Team Owner
              </Label>
              <select
                id="teamOwner"
                value={newTeam.ownerId}
                onChange={(e) => handleOwnerChange(parseInt(e.target.value))}
                className="col-span-3 bg-dark-surface border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="0">Select an owner</option>
                {teamOwners.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddTeamOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddTeam}
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={addTeamMutation.isPending}
            >
              {addTeamMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}