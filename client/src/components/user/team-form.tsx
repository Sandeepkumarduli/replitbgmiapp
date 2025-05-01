import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, UserPlus, User } from "lucide-react";
import { Team, TeamMember } from "@shared/schema";

type TeamFormProps = {
  team?: Team;
  isEditing?: boolean;
  onSuccess?: () => void;
};

const teamFormSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
});

const memberFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  gameId: z.string().min(3, "Game ID must be at least 3 characters"),
  role: z.enum(["captain", "member", "substitute"], {
    required_error: "Please select a role",
  }),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;
type MemberFormValues = z.infer<typeof memberFormSchema>;

export function TeamForm({ team, isEditing = false, onSuccess }: TeamFormProps) {
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: team?.name || "",
    },
  });

  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      username: "",
      gameId: "",
      role: "member",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (values: TeamFormValues) => {
      const res = await apiRequest("POST", "/api/teams", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my"] });
      toast({
        title: "Team created",
        description: "Your team has been created successfully",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (values: MemberFormValues & { teamId: number }) => {
      const res = await apiRequest("POST", `/api/teams/${values.teamId}/members`, {
        username: values.username,
        gameId: values.gameId,
        role: values.role,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}/members`] });
      toast({
        title: "Team member added",
        description: "The team member has been added successfully",
      });
      setMemberDialogOpen(false);
      memberForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onTeamSubmit = (values: TeamFormValues) => {
    createTeamMutation.mutateAsync(values);
  };

  const onMemberSubmit = (values: MemberFormValues) => {
    if (!team) return;
    addMemberMutation.mutateAsync({ ...values, teamId: team.id });
  };

  return (
    <>
      {/* Team Form */}
      {!isEditing ? (
        <Form {...teamForm}>
          <form onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Create Your Team
              </h2>
              <FormField
                control={teamForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Team Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter team name"
                        className="bg-dark-surface border-gray-700 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-gray-400">
                      This name will be displayed in tournaments
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white"
                disabled={createTeamMutation.isPending}
              >
                {createTeamMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              {team?.name}
            </h2>
            <Button 
              onClick={() => setMemberDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
          
          <p className="text-gray-400">
            Add up to 4 members and 1 substitute to your team
          </p>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="bg-dark-card border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the details of your team member
            </DialogDescription>
          </DialogHeader>
          
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-4">
              <FormField
                control={memberForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter username"
                        className="bg-dark-surface border-gray-700 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={memberForm.control}
                name="gameId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Game ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter BGMI game ID"
                        className="bg-dark-surface border-gray-700 text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={memberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-dark-surface border-gray-700 text-white">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-dark-card border-gray-700">
                        <SelectItem value="captain" className="text-white focus:bg-dark-surface focus:text-white">
                          Captain
                        </SelectItem>
                        <SelectItem value="member" className="text-white focus:bg-dark-surface focus:text-white">
                          Member
                        </SelectItem>
                        <SelectItem value="substitute" className="text-white focus:bg-dark-surface focus:text-white">
                          Substitute
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMemberDialogOpen(false)}
                  className="border-gray-700 text-white hover:bg-dark-surface"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
