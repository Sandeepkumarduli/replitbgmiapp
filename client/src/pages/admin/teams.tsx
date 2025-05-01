import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Search,
  MoreVertical,
  Users,
  Shield,
  UserX,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminTeams() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  // Fetch teams data
  const { data: teams, isLoading: isLoadingTeams } = useQuery<any[]>({
    queryKey: ["/api/teams"],
    enabled: isAuthenticated && isAdmin,
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await apiRequest("DELETE", `/api/teams/${teamId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Team deleted",
        description: "The team has been removed successfully",
      });
      setIsDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle delete team
  const handleDeleteTeam = (teamId: number) => {
    setSelectedTeamId(teamId);
    setIsDeleteOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedTeamId) {
      deleteTeamMutation.mutate(selectedTeamId);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      
      toast({
        title: "Refreshed",
        description: "Teams data has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh teams data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter teams based on search term
  const filteredTeams = teams?.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Teams Management</h1>
          <p className="text-gray-400">Manage all teams registered on the platform</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white mt-4 md:mt-0"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Search and filter */}
      <Card className="bg-dark-card border-gray-800 mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teams..."
              className="bg-dark-surface pl-10 border-gray-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Table */}
      <Card className="bg-dark-card border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-xl">All Teams</CardTitle>
          <CardDescription className="text-gray-400">
            Showing {filteredTeams?.length || 0} teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTeams ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <Table>
              <TableCaption>List of all registered teams</TableCaption>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Owner</TableHead>
                  <TableHead className="text-gray-300">Members</TableHead>
                  <TableHead className="text-gray-300">Created</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams && filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <TableRow key={team.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">{team.name}</TableCell>
                      <TableCell className="text-gray-300">Owner #{team.ownerId}</TableCell>
                      <TableCell className="text-gray-300">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 border-gray-800 hover:bg-dark-surface"
                          onClick={() => navigate(`/admin/teams/${team.id}/members`)}
                        >
                          <Users className="h-3.5 w-3.5 mr-1" />
                          View Members
                        </Button>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(team.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:bg-dark-surface">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-dark-card border-gray-800 text-white">
                            <DropdownMenuItem 
                              className="hover:bg-dark-surface cursor-pointer"
                              onClick={() => navigate(`/admin/users/${team.ownerId}`)}
                            >
                              <Shield className="mr-2 h-4 w-4 text-primary" />
                              View Owner
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-dark-surface text-red-500 cursor-pointer"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Delete Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                      {searchTerm ? "No teams match your search" : "No teams found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Team Deletion</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action will permanently delete the team and all its member information. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-gray-700 text-white hover:bg-dark-surface">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteTeamMutation.isPending}
            >
              {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}