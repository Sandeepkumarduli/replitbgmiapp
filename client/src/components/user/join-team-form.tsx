import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function JoinTeamForm() {
  const [inviteCode, setInviteCode] = useState("");
  const { toast } = useToast();

  const joinTeamMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/teams/join", { inviteCode: code });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Team joined successfully!",
        description: `You are now a member of the team: ${data.team.name}`,
      });
      setInviteCode("");
      
      // Force refresh all relevant queries
      Promise.all([
        // This invalidates teams data
        queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] }),
        // This invalidates any team member data
        queryClient.invalidateQueries({ queryKey: ["/api/teams"] }),
        // Force refetch for the specific team
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${data.team.id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${data.team.id}/members`] })
      ]);
      
      // Force a page refresh after a short delay to ensure UI is updated
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join team",
        description: error.message || "An error occurred while joining the team. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) {
      toast({
        title: "Invite code required",
        description: "Please enter a team invite code to join.",
        variant: "destructive",
      });
      return;
    }
    
    joinTeamMutation.mutate(inviteCode);
  };

  return (
    <Card className="bg-dark-card border-gray-800 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-700 to-purple-600"></div>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-white">Join a Team</CardTitle>
        </div>
        <CardDescription>
          Enter the 6-digit invite code to join an existing team
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="bg-dark-surface/50 p-4 rounded-md border border-indigo-800/30 text-sm text-gray-300">
              <p>Enter the team invitation code provided by the team captain or members.</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  className="bg-dark-surface text-white border-gray-700 focus:border-indigo-500 font-mono tracking-wider text-center uppercase"
                  maxLength={6}
                />
                {inviteCode.length > 0 && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-700 to-purple-600" 
                    style={{width: `${(inviteCode.length / 6) * 100}%`}}></div>
                )}
              </div>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={joinTeamMutation.isPending}
              >
                {joinTeamMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : "Join Team"}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-dark-surface/30 border-t border-gray-800 pt-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-900/50 text-indigo-400">
              <span>i</span>
            </div>
            <span>You can get the invite code from the team captain or any team member</span>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}