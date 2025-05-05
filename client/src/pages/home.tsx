import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TournamentList } from "@/components/user/tournament-list-fixed";
import { CheckCircle, UserPlus, Users, Trophy, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Home() {
  const [gameFilter, setGameFilter] = useState<'BGMI' | 'COD' | 'FREEFIRE' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
  // Function to refresh tournaments
  const refreshTournaments = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/tournaments?status=upcoming'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/registrations/counts'] });
      
      // Force refetch immediately
      await Promise.allSettled([
        queryClient.fetchQuery({ queryKey: ['/api/tournaments'] }),
        queryClient.fetchQuery({ queryKey: ['/api/tournaments?status=upcoming'] }),
        queryClient.fetchQuery({ queryKey: ['/api/registrations/counts'] }),
      ]);
    } catch (error) {
      // Silent fail is intentional - we don't want to stop the app if a refresh fails
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Load tournaments when component mounts
  useEffect(() => {
    refreshTournaments();
  }, []);
  return (
    <div className="min-h-screen bg-dark text-white font-poppins">
      {/* Hero Section */}
      <div className="hero-bg py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">RD TOURNAMENTS HUB</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
              An Ultimate Gaming Hub
            </p>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
              Join competitive tournaments for BGMI, FREEFIRE, COD and more games. Create teams and battle for glory!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth" className="inline-block">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-md text-lg font-medium shadow-md">
                  Register Now
                </Button>
              </Link>
              <Link href="/tournaments" className="inline-block">
                <Button variant="outline" className="bg-dark-surface hover:bg-dark-card border border-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium shadow-md bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
                  View Tournaments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tournaments Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-dark to-dark-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
            <div className="mb-6 md:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Upcoming Tournaments
              </h2>
              <p className="text-gray-400 mt-3 max-w-2xl">
                Register for our upcoming tournaments and show your skills on the battlefield. All tournaments feature cash prizes and exclusive rewards.
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
              
              <Link href="/tournaments" className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 hover:from-indigo-900/50 hover:to-purple-900/50 rounded-md border border-indigo-600 text-white font-medium group shadow-md">
                <span>View All Tournaments</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="bg-dark-card border border-gray-800 p-6 rounded-xl mb-10">
            {/* Game Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button 
                variant="outline" 
                className={`${gameFilter === 'BGMI' ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-indigo-900/20 to-purple-900/20'} border-indigo-600 text-white hover:from-indigo-700/40 hover:to-purple-700/40 focus:ring-indigo-500/50 shadow-md`}
                onClick={() => setGameFilter('BGMI')}>
                BGMI
              </Button>
              <Button 
                variant="outline" 
                className={`${gameFilter === 'COD' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20'} border-blue-600 text-white hover:from-blue-700/40 hover:to-cyan-700/40 focus:ring-blue-500/50 shadow-md`}
                onClick={() => setGameFilter('COD')}>
                COD
              </Button>
              <Button 
                variant="outline" 
                className={`${gameFilter === 'FREEFIRE' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-orange-900/20 to-amber-900/20'} border-orange-500 text-white hover:from-orange-600/40 hover:to-amber-600/40 focus:ring-orange-500/50 shadow-md`}
                onClick={() => setGameFilter('FREEFIRE')}>
                FREEFIRE
              </Button>
              <Button 
                variant="outline" 
                className={`${gameFilter === null ? 'bg-gradient-to-r from-gray-700 to-slate-700' : 'bg-gradient-to-r from-gray-900/20 to-slate-900/20'} border-gray-600 text-white hover:from-gray-800/40 hover:to-slate-800/40 focus:ring-gray-500/50 shadow-md`}
                onClick={() => setGameFilter(null)}>
                All Games
              </Button>
            </div>

            {/* Display live and upcoming tournaments by default (filter=undefined shows both) */}
            <TournamentList key={gameFilter} limit={6} gameTypeFilter={gameFilter} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">How It Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join our platform, compete in tournaments, and win exclusive prizes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-indigo-600 shadow-md">
                <UserPlus className="text-indigo-400 h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Create Account</h3>
              <p className="text-gray-400">Register with your unique username and BGMI game ID to get started</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-blue-600 shadow-md">
                <Users className="text-blue-400 h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Build Your Team</h3>
              <p className="text-gray-400">Create your team by adding up to 4 players plus substitutes</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-amber-600 shadow-md">
                <Trophy className="text-amber-400 h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Join Tournaments</h3>
              <p className="text-gray-400">Browse and register for tournaments to compete for prizes</p>
            </div>
          </div>
        </div>
      </section>

      {/* User Dashboard Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-surface relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary transform -skew-y-12"></div>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Powerful Dashboards</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Manage your tournaments, teams, and profile with our intuitive dashboards
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">User Dashboard</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6">
                    <CheckCircle className="text-indigo-400" />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    View all registered tournaments in one place
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6">
                    <CheckCircle className="text-blue-400" />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    Create and manage your personal profile with unique username
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6">
                    <CheckCircle className="text-green-400" />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    Build your team with up to 4 players and substitutes
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6">
                    <CheckCircle className="text-amber-400" />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    Track your tournament results and team performance
                  </p>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/user/dashboard" className="inline-block">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-md shadow-md">
                    Try User Dashboard
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-dark-card border border-indigo-700/30 rounded-lg shadow-lg p-6 bg-gradient-to-br from-dark-card to-gray-900/70">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-white">Your Registered Tournaments</h4>
                <span className="text-indigo-400">3 Tournaments</span>
              </div>
              <div className="space-y-4">
                <div className="bg-dark-surface p-4 rounded-lg border border-green-700/40 flex justify-between items-center shadow-md bg-gradient-to-r from-green-900/10 to-emerald-900/10">
                  <div>
                    <h5 className="text-white font-medium">BGMI Pro League</h5>
                    <p className="text-gray-400 text-sm">Today, 5:30 PM • Squad</p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block mr-2 status-indicator status-live"></span>
                    <span className="text-[#00CC66] text-sm font-medium">LIVE</span>
                  </div>
                </div>
                <div className="bg-dark-surface p-4 rounded-lg border border-green-700/40 flex justify-between items-center shadow-md bg-gradient-to-r from-green-900/10 to-emerald-900/10">
                  <div>
                    <h5 className="text-white font-medium">Weekend Warriors</h5>
                    <p className="text-gray-400 text-sm">Today, 6:00 PM • Duo</p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block mr-2 status-indicator status-live"></span>
                    <span className="text-[#00CC66] text-sm font-medium">LIVE</span>
                  </div>
                </div>
                <div className="bg-dark-surface p-4 rounded-lg border border-amber-600/40 flex justify-between items-center shadow-md bg-gradient-to-r from-amber-900/10 to-yellow-900/10">
                  <div>
                    <h5 className="text-white font-medium">BGMI Championship</h5>
                    <p className="text-gray-400 text-sm">July 25, 2:00 PM • Squad</p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block mr-2 status-indicator status-upcoming"></span>
                    <span className="text-[#FFCC00] text-sm font-medium">UPCOMING</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Ready to Join RD TOURNAMENTS HUB?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Create an account, build your team, and start competing in exciting gaming tournaments across multiple games today
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth" className="inline-block">
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-md text-lg font-medium shadow-md">
                Create Account
              </Button>
            </Link>
            <Link href="/tournaments" className="inline-block">
              <Button variant="outline" className="bg-dark-surface hover:bg-dark-card border border-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium shadow-md bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
                Browse Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}