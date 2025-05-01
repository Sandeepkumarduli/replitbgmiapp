import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TeamForm } from "@/components/user/team-form";
import { TeamCard } from "@/components/ui/team-card";
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
import { Users, AlertTriangle, Plus, RefreshCw } from "lucide-react";

export default function UserTeam() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [memberData, setMemberData] = useState({
    username: "",
    gameId: "",
    role: "member" // default role
  });
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

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

  const handleRemoveMember = (memberId: number) => {
    setMemberToDelete(memberId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (memberToDelete) {
      deleteMemberMutation.mutate(memberToDelete);
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
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
                if (teams && teams.length > 0) {
                  queryClient.invalidateQueries({ queryKey: [`/api/teams/${teams[0].id}/members`] });
                }
                toast({
                  title: "Refreshed",
                  description: "Team data has been refreshed",
                });
              }}
              variant="outline"
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {hasTeam && teams && teams.length < 3 && (
              <Button
                onClick={() => {
                  setCreateTeamDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Create New Team
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {!hasTeam ? (
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
          ) : (
            <>
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
                Are you sure you want to remove this team member? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
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
                disabled={deleteMemberMutation.isPending}
              >
                {deleteMemberMutation.isPending ? "Removing..." : "Remove Member"}
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
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter member's username"
                  className="bg-dark-surface border-gray-700 text-white"
                  value={memberData.username}
                  onChange={(e) => setMemberData({ ...memberData, username: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gameId" className="text-white">Game ID</Label>
                <Input
                  id="gameId"
                  placeholder="Enter member's BGMI ID"
                  className="bg-dark-surface border-gray-700 text-white"
                  value={memberData.gameId}
                  onChange={(e) => setMemberData({ ...memberData, gameId: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Role</Label>
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
                className="bg-primary hover:bg-primary/90"
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
                {addMemberMutation.isPending ? "Adding..." : "Add Member"}
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
