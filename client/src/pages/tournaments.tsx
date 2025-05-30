import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TournamentListWithTabs } from "@/components/user/tournament-list-fixed";
import { Button } from "@/components/ui/button";
import { Search, Trophy, RefreshCw, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function Tournaments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gameFilter, setGameFilter] = useState<'BGMI' | 'COD' | 'FREEFIRE' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
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
              Tournaments
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
            
            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`bg-dark-surface border-gray-700 text-white hover:bg-dark-card flex items-center gap-2 ${dateFilter ? 'border-primary' : ''}`}
                >
                  <Calendar className="h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'PP') : 'Filter by Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-dark-card border-gray-700">
                <CalendarComponent
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                  className="bg-dark-card text-white"
                />
                {dateFilter && (
                  <div className="p-3 border-t border-gray-800 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-dark-surface border-gray-700 text-gray-300 hover:bg-dark-card"
                      onClick={() => setDateFilter(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            
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
            className={`${gameFilter === 'BGMI' ? 'bg-primary' : 'bg-primary/20'} border-primary text-white hover:bg-primary/30 focus:ring-primary/50`}
            onClick={() => setGameFilter('BGMI')}>
            BGMI
          </Button>
          <Button 
            variant="outline" 
            className={`${gameFilter === 'COD' ? 'bg-primary/90' : 'bg-primary/15'} border-primary/70 text-white hover:bg-primary/25 focus:ring-primary/40`}
            onClick={() => setGameFilter('COD')}>
            COD
          </Button>
          <Button 
            variant="outline" 
            className={`${gameFilter === 'FREEFIRE' ? 'bg-accent' : 'bg-accent/20'} border-accent text-white hover:bg-accent/30 focus:ring-accent/50`}
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
          <TournamentListWithTabs gameTypeFilter={gameFilter} searchTerm={searchTerm} dateFilter={dateFilter} />
        </div>
      </div>
    </div>
  );
}
