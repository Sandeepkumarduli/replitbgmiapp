import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TournamentListWithTabs } from "@/components/user/tournament-list";
import { Button } from "@/components/ui/button";
import { Search, Trophy, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Tournaments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gameFilter, setGameFilter] = useState<'BGMI' | 'COD' | 'FREEFIRE' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshTournaments = () => {
    setIsRefreshing(true);
    // Invalidate tournaments and registration counts queries
    queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=live'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=completed'] });
    queryClient.invalidateQueries({ queryKey: ['/api/registrations/counts'] });
    
    // Show success toast
    toast({
      title: 'Refreshed',
      description: 'Tournament data has been updated',
    });
    
    // Reset refreshing state after a delay
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Trophy className="mr-3 h-8 w-8 text-primary" />
              RD Tournaments
            </h1>
            <p className="text-gray-400 max-w-2xl">
              Browse and register for upcoming tournaments, view live matches, and check past events
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="icon"
              className="bg-dark-surface border-gray-700 text-white hover:bg-dark-card"
              onClick={refreshTournaments}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search tournaments..."
                className="pl-10 bg-dark-surface border-gray-700 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {/* Game Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button 
            variant="outline" 
            className={`${gameFilter === 'BGMI' ? 'bg-blue-600' : 'bg-blue-600/20'} border-blue-600 text-white hover:bg-blue-600/30 focus:ring-blue-500`}
            onClick={() => setGameFilter('BGMI')}>
            BGMI
          </Button>
          <Button 
            variant="outline" 
            className={`${gameFilter === 'COD' ? 'bg-green-600' : 'bg-green-600/20'} border-green-600 text-white hover:bg-green-600/30 focus:ring-green-500`}
            onClick={() => setGameFilter('COD')}>
            COD
          </Button>
          <Button 
            variant="outline" 
            className={`${gameFilter === 'FREEFIRE' ? 'bg-red-600' : 'bg-red-600/20'} border-red-600 text-white hover:bg-red-600/30 focus:ring-red-500`}
            onClick={() => setGameFilter('FREEFIRE')}>
            FREEFIRE
          </Button>
          <Button 
            variant="outline" 
            className={`${gameFilter === null ? 'bg-gray-700' : 'bg-gray-700/70'} border-gray-600 text-white hover:bg-gray-600 focus:ring-gray-500`}
            onClick={() => setGameFilter(null)}>
            All Games
          </Button>
        </div>

        <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
          <TournamentListWithTabs gameTypeFilter={gameFilter} searchTerm={searchTerm} />
        </div>
      </div>
    </div>
  );
}
