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
import { Loader2, ArrowLeft, Edit, UserCog, Users, Save, Trash } from "lucide-react";
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-dark-card border-gray-800 md:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Team Details
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    View and edit team information
                  </CardDescription>
                </div>
                <div className="mt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    team?.gameType === "BGMI" 
                      ? "bg-indigo-900/50 text-indigo-300 border border-indigo-800" 
                      : team?.gameType === "COD" 
                        ? "bg-amber-900/50 text-amber-300 border border-amber-800"
                        : "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                  }`}>
                    {team?.gameType || "BGMI"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teamName" className="text-right text-white">
                      Team Name
                    </Label>
                    <Input
                      id="teamName"
                      value={editableTeam.name}
                      onChange={(e) => setEditableTeam({...editableTeam, name: e.target.value})}
                      className="col-span-3 bg-dark-surface border-gray-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gameType" className="text-right text-white">
                      Game
                    </Label>
                    <Select
                      value={editableTeam.gameType}
                      onValueChange={(value) => setEditableTeam({...editableTeam, gameType: value})}
                    >
                      <SelectTrigger className="col-span-3 bg-dark-surface border-gray-700 text-white">
                        <SelectValue placeholder="Select game" />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-surface border-gray-700 text-white">
                        <SelectItem value="BGMI">BGMI</SelectItem>
                        <SelectItem value="COD">COD</SelectItem>
                        <SelectItem value="FREEFIRE">FREEFIRE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="teamDescription" className="text-right mt-2 text-white">
                      Description
                    </Label>
                    <Textarea
                      id="teamDescription"
                      value={editableTeam.description}
                      onChange={(e) => setEditableTeam({...editableTeam, description: e.target.value})}
                      className="col-span-3 min-h-[100px] bg-dark-surface border-gray-700 text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                    <p className="text-white">{team?.description || "No description provided."}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Created</h3>
                      <p className="text-white">{team?.createdAt ? format(new Date(team.createdAt), "MMMM d, yyyy") : "Unknown"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-1">Team ID</h3>
                      <p className="text-white">{team?.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-dark-card border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Team Owner</CardTitle>
              <CardDescription className="text-gray-400">
                The user who manages this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOwnerLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : owner ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Username</h3>
                    <p className="text-white font-medium">{owner.username}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Email</h3>
                    <p className="text-white">{owner.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Role</h3>
                    <p className="text-white capitalize">{owner.role}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">ID</h3>
                    <p className="text-white">{owner.id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 py-4">No owner information available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-dark-card border-gray-800 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Team Members
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Current members of this team
                </CardDescription>
              </div>
              <Button 
                onClick={() => navigate(`/admin/teams/${teamId}/members`)}
                className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white"
              >
                <UserCog className="h-4 w-4" />
                Manage Members
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isMembersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {members.map((member: any) => (
                  <Card key={member.id} className="bg-dark-surface border-gray-700">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-700 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {(member.playerName || "?")[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-white font-medium">{member.playerName}</h3>
                          <p className="text-sm text-gray-400">{member.role || "Member"}</p>
                          <p className="text-xs text-gray-500">ID: {member.id}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No team members found.</p>
                <p className="mt-2">Add team members to participate in tournaments.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}