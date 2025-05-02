import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  ArrowLeft, 
  User, 
  UserPlus, 
  RefreshCw, 
  Trash, 
  Users, 
  Eye,
  UserSquare2
} from "lucide-react";
import AdminLayout from "@/components/layouts/admin-layout";
import { apiRequest } from "@/lib/queryClient";

export default function TeamMembers() {
  const { id } = useParams();
  const teamId = parseInt(id || '0');
  const { isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newMember, setNewMember] = useState({
    username: "",
    gameId: "",
    role: "Player"
  });

  interface Team {
    id: number;
    name: string;
    description: string;
    gameType: string;
    ownerId: number;
    createdAt: string;
  }

  interface TeamMember {
    id: number;
    teamId: number;
    username: string;
    gameId: string;
    role: string;
  }

  // Fetch team details
  const { 
    data: team, 
    isLoading: isTeamLoading, 
    isError,
    error
  } = useQuery<Team>({
    queryKey: [`/api/admin/teams/${teamId}`],
    enabled: !!teamId && !!isAdmin,
  });

  // Fetch team members
  const { 
    data: members = [] as TeamMember[], 
    isLoading: isMembersLoading,
    refetch: refetchMembers
  } = useQuery<TeamMember[]>({
    queryKey: [`/api/admin/teams/${teamId}/members`],
    enabled: !!teamId && !!isAdmin,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (memberData: any) => {
      const res = await apiRequest("POST", `/api/admin/teams/${teamId}/members`, memberData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/teams/${teamId}/members`] });
      setIsAddMemberOpen(false);
      setNewMember({ username: "", gameId: "", role: "Player" });
      toast({
        title: "Member added",
        description: "The team member has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/teams/${teamId}/members/${memberId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/teams/${teamId}/members`] });
      toast({
        title: "Member removed",
        description: "The team member has been removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/auth");
    }
  }, [isAdmin, isAuthenticated, authLoading, navigate]);

  const refreshMembers = async () => {
    setIsRefreshing(true);
    try {
      await refetchMembers();
      toast({
        title: "Team members refreshed",
        description: "The team members list has been refreshed"
      });
    } catch (error) {
      toast({
        title: "Failed to refresh members",
        description: "There was an error refreshing the members list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddMember = () => {
    if (!newMember.username) {
      toast({
        title: "Missing information",
        description: "Please provide a player name",
        variant: "destructive",
      });
      return;
    }

    // Validate team size based on game type
    const currentMemberCount = members.length;
    const maxMembers = getMaxTeamSizeByGameType(team?.gameType || "BGMI");
    
    if (currentMemberCount >= maxMembers) {
      toast({
        title: "Team is full",
        description: `Maximum ${maxMembers} members allowed for ${team?.gameType || "BGMI"} teams`,
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      teamId,
      username: newMember.username,
      gameId: newMember.gameId || team?.gameType || "BGMI",
      role: newMember.role
    });
  };

  const handleDeleteMember = (memberId: number, username: string) => {
    if (confirm(`Are you sure you want to remove ${username} from the team?`)) {
      deleteMemberMutation.mutate(memberId);
    }
  };

  // Helper function to determine max team size based on game type
  const getMaxTeamSizeByGameType = (gameType: string): number => {
    switch (gameType) {
      case "BGMI":
        return 4; // Squad
      case "COD":
      case "FREEFIRE":
        return 4; // Default squad
      default:
        return 4;
    }
  };

  if (authLoading || isTeamLoading) {
    return (
      <AdminLayout>
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center space-x-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin/teams")}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teams
            </Button>
          </div>
          <Card className="bg-dark-card border-gray-800">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-10">
                <p className="text-red-400 mb-4">Error loading team: {error?.toString()}</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/admin/teams")}
                  className="border-gray-700 text-white hover:bg-dark-surface"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Teams
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/admin/teams/${teamId}`)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Team Details
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{team?.name}: Members</h1>
              <p className="text-gray-400 mt-1">
                {members.length} / {getMaxTeamSizeByGameType(team?.gameType || "BGMI")} members
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-gray-700 text-white hover:bg-dark-card"
              onClick={refreshMembers}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white"
              onClick={() => setIsAddMemberOpen(true)}
              disabled={members.length >= getMaxTeamSizeByGameType(team?.gameType || "BGMI")}
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>

        <Card className="bg-dark-card border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage player roster for {team?.name} ({team?.gameType})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMembersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-dark-surface">
                  <TableRow className="hover:bg-dark-surface/80 border-gray-800">
                    <TableHead className="text-gray-400">ID</TableHead>
                    <TableHead className="text-gray-400">Player Name</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.id} className="hover:bg-dark-surface/50 border-gray-800">
                      <TableCell className="text-gray-300">
                        {member.id}
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <UserSquare2 className="h-4 w-4 text-indigo-400" />
                          {member.username}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <span className="px-2.5 py-1 bg-gray-700/50 text-gray-300 rounded-full text-xs font-medium">
                          {member.role || "Player"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteMember(member.id, member.username)}
                          className="h-8 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                        No team members found. Add players to participate in tournaments.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new player to {team?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Player Name
              </Label>
              <Input
                id="username"
                value={newMember.username}
                onChange={(e) => setNewMember({...newMember, username: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
                placeholder="Enter player name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gameId" className="text-right">
                Game ID
              </Label>
              <Input
                id="gameId"
                value={newMember.gameId}
                onChange={(e) => setNewMember({...newMember, gameId: e.target.value})}
                className="col-span-3 bg-dark-surface border-gray-700 text-white"
                placeholder="Enter player game ID"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="playerRole" className="text-right">
                Role
              </Label>
              <select
                id="playerRole"
                value={newMember.role}
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                className="col-span-3 bg-dark-surface border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="Player">Player</option>
                <option value="Captain">Captain</option>
                <option value="Coach">Coach</option>
                <option value="Substitute">Substitute</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddMemberOpen(false)}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddMember}
              className="bg-indigo-700 hover:bg-indigo-800 text-white"
              disabled={addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}