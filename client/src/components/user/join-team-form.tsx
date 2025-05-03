import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
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
    onSuccess: () => {
      toast({
        title: "Team joined successfully!",
        description: "You are now a member of this team.",
      });
      setInviteCode("");
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
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
    <Card className="bg-dark-card border-gray-800">
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
          <div className="flex items-center space-x-2">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="bg-dark-surface text-white border-gray-700 focus:border-indigo-500"
              maxLength={6}
            />
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={joinTeamMutation.isPending}
            >
              {joinTeamMutation.isPending ? "Joining..." : "Join Team"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-gray-400 border-t border-gray-800 pt-4">
          You can get the invite code from the team captain or any team member
        </CardFooter>
      </form>
    </Card>
  );
}