import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Plus, X } from "lucide-react";
import { Team, TeamMember } from "@shared/schema";

type TeamCardProps = {
  team?: Team;
  members?: TeamMember[];
  onManage?: () => void;
  onAddMember?: (team?: Team) => void;
  onRemoveMember?: (memberId: number) => void;
};

export function TeamCard({ team, members = [], onManage, onAddMember, onRemoveMember }: TeamCardProps) {
  if (!team) {
    return (
      <Card className="bg-dark-card border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Create Your Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <User className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">You haven't created a team yet</p>
            <Button onClick={onManage} className="bg-primary hover:bg-primary/90">
              Create Team
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const captain = members.find(m => m.role === "captain");
  const regularMembers = members.filter(m => m.role === "member");
  const substitutes = members.filter(m => m.role === "substitute");

  return (
    <Card className="bg-dark-card border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">{team.name}</CardTitle>
        <Button variant="outline" size="sm" onClick={onManage}>
          Manage Team
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {captain && (
            <div className="bg-dark-surface p-3 rounded-lg border border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{captain.username}</p>
                    <p className="text-gray-400 text-xs">Game ID: {captain.gameId}</p>
                  </div>
                </div>
                <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded">
                  Captain
                </div>
              </div>
            </div>
          )}

          <h3 className="text-sm font-medium text-gray-400 mt-4">Team Members</h3>
          {regularMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No team members yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regularMembers.map(member => (
                <div key={member.id} className="bg-dark-surface p-3 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{member.username}</p>
                        <p className="text-gray-400 text-xs">Game ID: {member.gameId}</p>
                      </div>
                    </div>
                    {onRemoveMember && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemoveMember(member.id)}
                        className="h-6 w-6 text-gray-400 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {substitutes.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-400 mt-4">Substitutes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {substitutes.map(sub => (
                  <div key={sub.id} className="bg-dark-surface p-3 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{sub.username}</p>
                          <p className="text-gray-400 text-xs">Game ID: {sub.gameId}</p>
                        </div>
                      </div>
                      {onRemoveMember && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onRemoveMember(sub.id)}
                          className="h-6 w-6 text-gray-400 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {members.length < 5 && onAddMember && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4" 
              onClick={(e) => { 
                e.preventDefault(); 
                if (onAddMember) onAddMember(team); 
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Team Member
            </Button>
          )}
          
          {members.length >= 5 && (
            <div className="text-center text-sm text-amber-500 mt-4 p-2 border border-amber-500/20 rounded bg-amber-500/10">
              Maximum team size reached (5 members)
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
