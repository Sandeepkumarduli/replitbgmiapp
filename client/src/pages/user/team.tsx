import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TeamForm } from "@/components/user/team-form";
import { TeamCard } from "@/components/ui/team-card";
import { JoinTeamForm } from "@/components/user/join-team-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Team, TeamMember } from "@shared/schema";
import { Users, AlertTriangle, Plus, RefreshCw, User } from "lucide-react";

export default function UserTeam() {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  const [memberToDeleteName, setMemberToDeleteName] = useState<string>("");
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [memberData, setMemberData] = useState({
    username: "",
    gameId: "",
    role: "member" // default role
  });
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);
  const [teamToDeleteName, setTeamToDeleteName] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch user's teams
  const { data: teams, isLoading: isTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams/my"],
    enabled: isAuthenticated && !isAdmin,
  });

  // Fetch team members if team exists
  const { data: teamMembers, isLoading: isMembersLoading } = useQuery<TeamMember[]>({
    queryKey: teams && teams.length > 0 ? [`/api/teams/${teams[0].id}/members`] : ["/api/teams/no-members"],
    enabled: isAuthenticated && !isAdmin && teams && teams.length > 0,
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await apiRequest("DELETE", `/api/teams/members/${memberId}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teams?.[0].id}/members`] });
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully",
      });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }

    if (!isLoading && isAuthenticated && isAdmin) {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  // Add team member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { username: string; gameId: string; teamId: number; role: string }) => {
      const res = await apiRequest("POST", `/api/teams/${data.teamId}/members`, data);
      return res.json();
    },
    onSuccess: () => {
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${selectedTeam.id}/members`] });
        toast({
          title: "Team member added",
          description: "The team member has been added successfully",
        });
      }
      setAddMemberDialogOpen(false);
      setMemberData({ username: "", gameId: "", role: "member" });
      setSelectedTeam(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddMember = (team: Team) => {
    setSelectedTeam(team);
    setAddMemberDialogOpen(true);
  };
  
  const handleManageTeam = (team: Team) => {
    // Scroll to the team's card
    const teamElement = document.getElementById(`team-${team.id}`);
    if (teamElement) {
      teamElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Flash effect to highlight the team card
      teamElement.classList.add('border-primary');
      setTimeout(() => {
        teamElement.classList.remove('border-primary');
      }, 1500);
      
      toast({
        title: "Team Management",
        description: `You're now viewing ${team.name}'s details`,
      });
    }
  };

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      console.log(`Attempting to delete team with ID: ${teamId}`);
      try {
        const res = await apiRequest("DELETE", `/api/teams/${teamId}`, undefined);
        
        if (!res.ok) {
          // Try to get error message from server
          const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
          throw new Error(errorData.error || `Failed to delete team. Server responded with status: ${res.status}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error in delete team mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Team deleted successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      toast({
        title: "Team deleted",
        description: "Your team has been deleted successfully",
      });
      setDeleteTeamDialogOpen(false);
      setTeamToDelete(null);
      setTeamToDeleteName("");
    },
    onError: (error: Error) => {
      console.error("Failed to delete team:", error);
      toast({
        title: "Failed to delete team",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handleRemoveMember = (memberId: number, memberName: string = "") => {
    setMemberToDelete(memberId);
    setMemberToDeleteName(memberName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTeam = (teamId: number, teamName: string = "") => {
    setTeamToDelete(teamId);
    setTeamToDeleteName(teamName);
    setDeleteTeamDialogOpen(true);
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] }),
      ...(teams && teams.length > 0 
        ? teams.map(team => queryClient.invalidateQueries({ 
            queryKey: [`/api/teams/${team.id}/members`] 
          }))
        : [])
    ])
    .then(() => {
      toast({
        title: "Teams refreshed",
        description: "Your team data has been updated successfully",
      });
    })
    .catch(error => {
      toast({
        title: "Refresh failed",
        description: "Failed to update team data. Please try again.",
        variant: "destructive"
      });
    })
    .finally(() => {
      setIsRefreshing(false);
    });
  };

  const confirmDelete = () => {
    if (memberToDelete) {
      deleteMemberMutation.mutate(memberToDelete);
    }
  };
  
  const confirmDeleteTeam = () => {
    if (teamToDelete) {
      deleteTeamMutation.mutate(teamToDelete);
    }
  };

  if (isLoading || isTeamsLoading || isMembersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || isAdmin) {
    return null;
  }

  const hasTeam = teams && teams.length > 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Users className="mr-2 h-7 w-7 text-primary" />
            {hasTeam ? "Manage Your Teams" : "Create Your Team"}
          </h1>
          
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-gray-700 text-white hover:bg-dark-surface"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            {hasTeam && teams && teams.length < 3 && (
              <Button
                onClick={() => {
                  setCreateTeamDialogOpen(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Team
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {!hasTeam ? (
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-dark-card border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Team Creation</CardTitle>
                  <CardDescription className="text-gray-400">
                    Create your first team to participate in tournaments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] })} />
                </CardContent>
              </Card>
              
              <JoinTeamForm />
            </div>
          ) : (
            <>
              {/* Join with invite code section for users with existing teams */}
              {teams && teams.length < 3 && (
                <div className="mb-6">
                  <JoinTeamForm />
                </div>
              )}
              
              {teams && teams.length >= 3 && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg mb-6">
                  <p className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    You've reached the maximum limit of 3 teams per user
                  </p>
                </div>
              )}
              
              {teams && teams.map((team, index) => (
                <div key={team.id} className="space-y-8 mb-12">
                  <Card id={`team-${team.id}`} className="bg-dark-card border-gray-800 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Users className="mr-2 h-5 w-5 text-primary" />
                        Team {index + 1}: {team.name}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Manage your team members
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TeamForm 
                        team={team} 
                        isEditing={true} 
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-dark-card border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Team Members</CardTitle>
                      <CardDescription className="text-gray-400">
                        Your current team roster
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TeamCard 
                        team={team}
                        members={teamMembers ? teamMembers.filter((member: TeamMember) => member.teamId === team.id) : []}
                        onAddMember={() => handleAddMember(team)}
                        onManage={() => handleManageTeam(team)}
                        onRemoveMember={handleRemoveMember}
                        onDeleteTeam={handleDeleteTeam}
                      />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Remove Team Member
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to remove {memberToDeleteName ? <span className="font-semibold text-white">{memberToDeleteName}</span> : "this team member"}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-red-400 text-sm flex items-start">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Removing a member will permanently delete their association with this team.
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
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
                onClick={confirmDelete}
                disabled={deleteMemberMutation.isPending}
              >
                {deleteMemberMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Member"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Add Team Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Plus className="h-5 w-5 text-primary mr-2" />
                Add Team Member
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new member to your team. The user must already exist on the platform.
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-2 mb-4 bg-indigo-600/10 border border-indigo-600/20 rounded-md">
              <p className="text-indigo-400 text-sm flex items-start">
                <User className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                Adding a member to <span className="font-semibold text-indigo-300 mx-1">{selectedTeam?.name}</span>
              </p>
            </div>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username <span className="text-red-400">*</span></Label>
                <Input
                  id="username"
                  placeholder="Enter member's username"
                  className="bg-dark-surface border-gray-700 text-white"
                  value={memberData.username}
                  onChange={(e) => setMemberData({ ...memberData, username: e.target.value })}
                />
                <p className="text-xs text-gray-400">The username must match an existing user in the system</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gameId" className="text-white">Game ID <span className="text-red-400">*</span></Label>
                <Input
                  id="gameId"
                  placeholder="Enter member's BGMI ID"
                  className="bg-dark-surface border-gray-700 text-white"
                  value={memberData.gameId}
                  onChange={(e) => setMemberData({ ...memberData, gameId: e.target.value })}
                />
                <p className="text-xs text-gray-400">Enter the in-game ID (BGMI/FREEFIRE/COD) for this member</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Role <span className="text-red-400">*</span></Label>
                <Select
                  value={memberData.role}
                  onValueChange={(value) => setMemberData({ ...memberData, role: value })}
                >
                  <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-card border-gray-800">
                    <SelectItem value="member" className="text-white hover:bg-dark-surface">Team Member</SelectItem>
                    <SelectItem value="substitute" className="text-white hover:bg-dark-surface">Substitute</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">Regular team members count toward team size limits</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setAddMemberDialogOpen(false);
                  setMemberData({ username: "", gameId: "", role: "member" });
                }}
                className="border-gray-700 text-white hover:bg-dark-surface"
              >
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
                onClick={() => {
                  if (selectedTeam && memberData.username && memberData.gameId) {
                    addMemberMutation.mutate({
                      teamId: selectedTeam.id,
                      username: memberData.username,
                      gameId: memberData.gameId,
                      role: memberData.role
                    });
                  } else {
                    toast({
                      title: "Missing information",
                      description: "Please fill in all fields",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={addMemberMutation.isPending || !memberData.username || !memberData.gameId}
              >
                {addMemberMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Team Confirmation Dialog */}
        <Dialog open={deleteTeamDialogOpen} onOpenChange={setDeleteTeamDialogOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Delete Team
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete {teamToDeleteName ? <span className="font-semibold text-white">{teamToDeleteName}</span> : "this team"}? All members and data will be permanently removed. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-red-400 text-sm flex items-start">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                This is a permanent action. All team registrations, members, and tournament associations will be deleted.
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteTeamDialogOpen(false)}
                className="border-gray-700 text-white hover:bg-dark-surface"
              >
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
                onClick={confirmDeleteTeam}
                disabled={deleteTeamMutation.isPending}
              >
                {deleteTeamMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Create New Team Dialog */}
        <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
          <DialogContent className="bg-dark-card border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                Create New Team
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Create an additional team to participate in tournaments
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <TeamForm 
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
                  setCreateTeamDialogOpen(false);
                  toast({
                    title: "Team created successfully",
                    description: "Your new team is ready to be managed",
                  });
                }} 
              />
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setCreateTeamDialogOpen(false)}
                className="border-gray-700 text-white hover:bg-dark-surface"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
