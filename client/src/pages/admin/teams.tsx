import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Team as BaseTeam, User } from "@shared/schema";

// Extend the Team type to include owner and memberCount properties
interface EnhancedTeam extends BaseTeam {
  owner?: {
    id: number;
    username: string;
    role: string;
    email: string;
  };
  memberCount?: number;
}

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Filter, MoreVertical, Search, Trash, Users, UsersRound, Eye, Shield } from "lucide-react";
import AdminLayout from "../../components/layouts/admin-layout";

type Team = EnhancedTeam;

export default function AdminTeams() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Fetch all teams
  const { data: teams, isLoading } = useQuery({
    queryKey: ['/api/admin/teams'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/teams');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch teams');
      }
      return res.json() as Promise<Team[]>;
    }
  });
  
  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/teams/${teamId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete team');
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "The team has been successfully deleted",
        variant: "default",
      });
      
      // Invalidate teams query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      
      // Close the dialog
      setIsDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleDeleteTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedTeam) {
      deleteTeamMutation.mutate(selectedTeam.id);
    }
  };
  
  const filteredTeams = teams ? teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(team.id).includes(searchTerm)
  ) : [];
  
  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Teams Management</h2>
            <p className="text-gray-400 mt-1">
              View and manage all registered teams in the system
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search teams..."
                className="pl-8 bg-dark-surface border-gray-800 text-white w-full sm:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      
        <Card className="bg-dark-card border-gray-800 overflow-hidden">
          <CardHeader className="bg-dark-surface border-b border-gray-800 pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-white">Team List</CardTitle>
              <Badge variant="outline" className="text-primary border-primary">
                <UsersRound className="h-3 w-3 mr-1" />
                {teams?.length || 0} Teams
              </Badge>
            </div>
            <CardDescription>
              All teams registered on the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full bg-dark-surface" />
                <Skeleton className="h-12 w-full bg-dark-surface" />
                <Skeleton className="h-12 w-full bg-dark-surface" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-dark-surface">
                  <TableRow className="hover:bg-dark-surface/80 border-gray-800">
                    <TableHead className="text-gray-400">ID</TableHead>
                    <TableHead className="text-gray-400">Team Name</TableHead>
                    <TableHead className="text-gray-400">Owner</TableHead>
                    <TableHead className="text-gray-400">Members</TableHead>
                    <TableHead className="text-gray-400">Created</TableHead>
                    <TableHead className="text-right text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => (
                      <TableRow 
                        key={team.id} 
                        className="hover:bg-dark-surface/50 border-gray-800 hover:cursor-pointer"
                      >
                        <TableCell className="font-mono text-gray-400">
                          {team.id}
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          {team.name}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <span className="flex items-center">
                            <Shield className={`h-3.5 w-3.5 mr-1.5 ${team.owner?.role === 'admin' ? 'text-accent' : 'text-primary'}`} />
                            {team.owner?.username || `User #${team.ownerId}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-dark-surface border-gray-700 text-gray-300">
                            <Users className="h-3 w-3 mr-1 text-primary" />
                            {team.memberCount || 1} {(team.memberCount || 1) === 1 ? 'member' : 'members'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
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
                                onClick={() => navigate(`/admin/teams/${team.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-primary" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-800" />
                              <DropdownMenuItem 
                                className="hover:bg-dark-surface text-red-500 cursor-pointer"
                                onClick={() => handleDeleteTeam(team)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-6">
                        {searchTerm ? "No teams match your search" : "No teams found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="border-t border-gray-800 p-4">
            <div className="text-xs text-gray-400 flex items-center">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Manage teams efficiently to ensure fair tournament participation
            </div>
          </CardFooter>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Confirm Team Deletion</DialogTitle>
              <DialogDescription className="text-gray-400">
                This action will permanently delete the team &quot;{selectedTeam?.name}&quot; and remove all its members.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-dark-surface rounded-md border border-gray-800 mt-2">
              <p className="font-semibold text-primary">Important:</p>
              <ul className="list-disc pl-5 mt-2 text-sm text-gray-300 space-y-1">
                <li>All team members will be removed</li>
                <li>All tournament registrations for this team will be deleted</li>
                <li>The team owner will be notified of this action</li>
              </ul>
            </div>
            <DialogFooter className="mt-4">
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
    </AdminLayout>
  );
}