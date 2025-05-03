import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Edit, UserCog, Users, Save, Trash, Copy, Check } from "lucide-react";
import AdminLayout from "@/components/layouts/admin-layout";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function TeamDetails() {
  const { id } = useParams();
  const teamId = parseInt(id || '0');
  const { isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editableTeam, setEditableTeam] = useState({
    name: "",
    description: "",
    gameType: "BGMI"
  });

  interface Team {
    id: number;
    name: string;
    description: string;
    gameType: string;
    ownerId: number;
    createdAt: string;
    inviteCode: string;
  }

  interface User {
    id: number;
    username: string;
    email: string;
    role: string;
  }

  interface TeamMember {
    id: number;
    teamId: number;
    playerName: string;
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

  // Fetch team owner details
  const { 
    data: owner, 
    isLoading: isOwnerLoading 
  } = useQuery<User>({
    queryKey: [`/api/admin/users/${team?.ownerId}`],
    enabled: !!team?.ownerId && !!isAdmin,
  });

  // Fetch team members
  const { 
    data: members = [] as TeamMember[], 
    isLoading: isMembersLoading 
  } = useQuery<TeamMember[]>({
    queryKey: [`/api/admin/teams/${teamId}/members`],
    enabled: !!teamId && !!isAdmin,
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (updatedTeam: any) => {
      const res = await apiRequest("PATCH", `/api/admin/teams/${teamId}`, updatedTeam);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/teams/${teamId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teams"] });
      setIsEditing(false);
      toast({
        title: "Team updated",
        description: "The team has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/admin/teams/${teamId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teams"] });
      toast({
        title: "Team deleted",
        description: "The team has been deleted successfully",
      });
      navigate("/admin/teams");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete team",
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

  useEffect(() => {
    if (team) {
      setEditableTeam({
        name: team.name || "",
        description: team.description || "",
        gameType: team.gameType || "BGMI"
      });
    }
  }, [team]);

  const handleUpdate = () => {
    if (!editableTeam.name) {
      toast({
        title: "Missing information",
        description: "Please provide a team name",
        variant: "destructive",
      });
      return;
    }

    updateTeamMutation.mutate(editableTeam);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete team ${team?.name}?`)) {
      deleteTeamMutation.mutate();
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
                <p className="text-red-400 mb-4">Error loading team details: {error?.toString()}</p>
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
              onClick={() => navigate("/admin/teams")}
              className="border-gray-700 text-white hover:bg-dark-surface"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teams
            </Button>
            <h1 className="text-3xl font-bold text-white">{team?.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate(`/admin/teams/${teamId}/members`)}
              className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              <UserCog className="h-4 w-4" />
              Manage Members
            </Button>
            {!isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
              >
                <Edit className="h-4 w-4" />
                Edit Team
              </Button>
            ) : (
              <Button 
                onClick={handleUpdate}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
                disabled={updateTeamMutation.isPending}
              >
                {updateTeamMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={handleDelete}
              variant="destructive"
              className="flex items-center gap-2"
              disabled={deleteTeamMutation.isPending}
            >
              {deleteTeamMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Banner Card with Team Info */}
        <Card className="bg-gradient-to-r from-dark-card to-dark-surface border-gray-800 overflow-hidden mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#6c2dc7]/5 pointer-events-none"></div>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-[#6c2dc7]/20 border border-[#6c2dc7]/30 flex items-center justify-center">
                    <Users className="h-8 w-8 text-[#6c2dc7]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {team?.name}
                    </h2>
                    <div className="flex items-center mt-1 gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-[#6c2dc7]/20 text-[#9f6dff] border border-[#6c2dc7]/30`}>
                        {team?.gameType || "BGMI"}
                      </span>
                      <span className="text-sm text-gray-400">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                      </span>
                      <span className="text-sm text-gray-400">
                        Created {team?.createdAt ? format(new Date(team.createdAt), "MMM d, yyyy") : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                  <Button 
                    onClick={() => navigate(`/admin/teams/${teamId}/members`)}
                    className="flex items-center gap-2 bg-[#6c2dc7]/20 hover:bg-[#6c2dc7]/30 text-[#9f6dff] border border-[#6c2dc7]/30"
                  >
                    <UserCog className="h-4 w-4" />
                    Manage Members
                  </Button>
                  {!isEditing ? (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Team
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleUpdate}
                      className="flex items-center gap-2 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white"
                      disabled={updateTeamMutation.isPending}
                    >
                      {updateTeamMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    onClick={handleDelete}
                    variant="destructive"
                    className="flex items-center gap-2"
                    disabled={deleteTeamMutation.isPending}
                  >
                    {deleteTeamMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash className="h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Details Card */}
          <Card className="bg-dark-card border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="mr-2 h-5 w-5 text-[#6c2dc7]" />
                Team Details
              </CardTitle>
              <CardDescription className="text-gray-400">
                View and edit team information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-6 p-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="teamName" className="md:text-right text-white">
                      Team Name
                    </Label>
                    <Input
                      id="teamName"
                      value={editableTeam.name}
                      onChange={(e) => setEditableTeam({...editableTeam, name: e.target.value})}
                      className="md:col-span-3 bg-dark-surface border-gray-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <Label htmlFor="gameType" className="md:text-right text-white">
                      Game
                    </Label>
                    <Select
                      value={editableTeam.gameType}
                      onValueChange={(value) => setEditableTeam({...editableTeam, gameType: value})}
                    >
                      <SelectTrigger className="md:col-span-3 bg-dark-surface border-gray-700 text-white">
                        <SelectValue placeholder="Select game" />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-surface border-gray-700 text-white">
                        <SelectItem value="BGMI">BGMI</SelectItem>
                        <SelectItem value="COD">COD</SelectItem>
                        <SelectItem value="FREEFIRE">FREEFIRE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                    <Label htmlFor="teamDescription" className="md:text-right mt-2 text-white">
                      Description
                    </Label>
                    <Textarea
                      id="teamDescription"
                      value={editableTeam.description}
                      onChange={(e) => setEditableTeam({...editableTeam, description: e.target.value})}
                      className="md:col-span-3 min-h-[120px] bg-dark-surface border-gray-700 text-white"
                      placeholder="Enter a description for your team"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 p-2">
                  <div className="bg-dark-surface p-4 rounded-md border border-gray-700">
                    <h3 className="text-sm font-medium text-[#9f6dff] mb-2">Description</h3>
                    <p className="text-white">{team?.description || "No description provided."}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-dark-surface p-4 rounded-md border border-gray-700">
                      <h3 className="text-sm font-medium text-[#9f6dff] mb-2">Created</h3>
                      <p className="text-white">{team?.createdAt ? format(new Date(team.createdAt), "MMMM d, yyyy") : "Unknown"}</p>
                    </div>
                    <div className="bg-dark-surface p-4 rounded-md border border-gray-700">
                      <h3 className="text-sm font-medium text-[#9f6dff] mb-2">Team ID</h3>
                      <p className="text-white">{team?.id}</p>
                    </div>
                  </div>
                  
                  {/* Invite Code Section */}
                  {team?.inviteCode && (
                    <div className="bg-indigo-950/60 p-4 rounded-md border border-indigo-600/30 mt-4">
                      <h3 className="text-sm font-medium text-indigo-400 mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Team Invite Code
                      </h3>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 bg-indigo-950/80 p-3 rounded border border-indigo-700/30">
                        <div className="font-mono text-white text-md tracking-wider px-2">{team.inviteCode}</div>
                        <Button 
                          variant="ghost"
                          size="sm" 
                          onClick={() => {
                            navigator.clipboard.writeText(team.inviteCode);
                            toast({
                              title: "Invite code copied!",
                              description: "You can now share this code with others to join your team."
                            });
                          }}
                          className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/50"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Share this code with players to join this team. Players can use this code on their dashboard to join.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Owner Card */}
          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserCog className="mr-2 h-5 w-5 text-[#6c2dc7]" />
                Team Owner
              </CardTitle>
              <CardDescription className="text-gray-400">
                The user who manages this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOwnerLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-[#6c2dc7]" />
                </div>
              ) : owner ? (
                <div className="bg-dark-surface p-4 rounded-md border border-gray-700">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-[#6c2dc7]/20 border border-[#6c2dc7]/30 flex items-center justify-center">
                      <span className="text-[#6c2dc7] font-bold text-lg">
                        {(owner.username || "?")[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{owner.username}</h3>
                      <p className="text-gray-400 text-sm capitalize">{owner.role}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 mb-1">Email</h3>
                      <p className="text-white text-sm bg-dark-card p-2 rounded border border-gray-800">{owner.email}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 mb-1">User ID</h3>
                      <p className="text-white text-sm bg-dark-card p-2 rounded border border-gray-800">{owner.id}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 bg-dark-surface p-4 rounded-md border border-gray-700">
                  <p>No owner information available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Members Card */}
        <Card className="bg-dark-card border-gray-800 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5 text-[#6c2dc7]" />
                  Team Members
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Current members of this team ({members.length} / {team?.gameType === "BGMI" ? 4 : team?.gameType === "COD" ? 4 : 4})
                </CardDescription>
              </div>
              <Button 
                onClick={() => navigate(`/admin/teams/${teamId}/members`)}
                className="flex items-center gap-2 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white"
              >
                <UserCog className="h-4 w-4" />
                Manage Members
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isMembersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#6c2dc7]" />
              </div>
            ) : members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {members.map((member: any) => (
                  <div key={member.id} className="bg-dark-surface border border-gray-700 rounded-md p-4 hover:border-[#6c2dc7]/30 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-[#6c2dc7]/20 border border-[#6c2dc7]/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#6c2dc7] font-semibold">
                          {(member.playerName || "?")[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium truncate">{member.playerName}</h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#6c2dc7]/10 text-[#9f6dff] text-xs rounded-full">
                            {member.role || "Player"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                      Member ID: {member.id}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-dark-surface border border-gray-700 rounded-md">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-medium">No team members found</p>
                <p className="mt-2 text-gray-400 max-w-md mx-auto">
                  Add team members to participate in tournaments. Team size requirements depend on the tournament type.
                </p>
                <Button 
                  onClick={() => navigate(`/admin/teams/${teamId}/members`)}
                  className="mt-4 bg-[#6c2dc7] hover:bg-[#6c2dc7]/90 text-white"
                >
                  Add Members
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}