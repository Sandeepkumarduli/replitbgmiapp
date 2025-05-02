import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Gamepad, Trophy, Clock, Users, ArrowRight } from "lucide-react";

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-surface relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary transform -skew-y-12"></div>
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Our <span className="text-primary">Games</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Compete in tournaments across your favorite gaming titles
            </p>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Featured Games</h2>
          
          {/* BGMI */}
          <div className="bg-dark-card border border-gray-800 rounded-xl mb-16 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="bg-gradient-to-br from-blue-900/30 to-transparent p-8 lg:p-12">
                <div className="flex items-center mb-6">
                  <Gamepad className="text-primary h-10 w-10 mr-4" />
                  <h3 className="text-3xl font-bold text-white">Battlegrounds Mobile India</h3>
                </div>
                
                <p className="text-gray-300 mb-6 text-lg">
                  The premier battle royale experience with intense 100-player matches across various maps. Drop in, gear up, and be the last one standing to claim victory.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Trophy className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Competition Types</h4>
                    <p className="text-gray-400 text-sm">Squad, Duo, Solo</p>
                  </div>
                  
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Clock className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Match Duration</h4>
                    <p className="text-gray-400 text-sm">25-30 minutes</p>
                  </div>
                  
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Users className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Team Size</h4>
                    <p className="text-gray-400 text-sm">Solo, 2-player, 4-player</p>
                  </div>
                </div>
                
                <Link href="/tournaments?game=bgmi">
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    View BGMI Tournaments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="bg-gradient-to-br from-blue-800/20 to-dark-card h-64 lg:h-auto flex items-center justify-center">
                <div className="text-center px-6">
                  <h3 className="text-4xl md:text-6xl font-bold text-white">BGMI</h3>
                  <p className="text-lg text-gray-400 mt-2">Currently active</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* FREEFIRE */}
          <div className="bg-dark-card border border-gray-800 rounded-xl mb-16 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="order-2 lg:order-1 bg-gradient-to-br from-red-800/20 to-dark-card h-64 lg:h-auto flex items-center justify-center">
                <div className="text-center px-6">
                  <h3 className="text-4xl md:text-6xl font-bold text-white">FREEFIRE</h3>
                  <p className="text-lg text-gray-400 mt-2">Coming Soon</p>
                </div>
              </div>
              
              <div className="order-1 lg:order-2 bg-gradient-to-br from-red-900/30 to-transparent p-8 lg:p-12">
                <div className="flex items-center mb-6">
                  <Gamepad className="text-primary h-10 w-10 mr-4" />
                  <h3 className="text-3xl font-bold text-white">Garena Free Fire</h3>
                </div>
                
                <p className="text-gray-300 mb-6 text-lg">
                  Fast-paced battle royale with unique character abilities and intense 10-minute matches. Enjoy quickfire battles across detailed maps with special skills and abilities.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Trophy className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Competition Types</h4>
                    <p className="text-gray-400 text-sm">Squad, Duo, Solo</p>
                  </div>
                  
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Clock className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Match Duration</h4>
                    <p className="text-gray-400 text-sm">10-15 minutes</p>
                  </div>
                  
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Users className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Team Size</h4>
                    <p className="text-gray-400 text-sm">Solo, 2-player, 4-player</p>
                  </div>
                </div>
                
                <Button disabled className="bg-gray-700 text-gray-300 cursor-not-allowed">
                  Tournaments Coming Soon
                </Button>
              </div>
            </div>
          </div>
          
          {/* COD Mobile */}
          <div className="bg-dark-card border border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="bg-gradient-to-br from-green-900/30 to-transparent p-8 lg:p-12">
                <div className="flex items-center mb-6">
                  <Gamepad className="text-primary h-10 w-10 mr-4" />
                  <h3 className="text-3xl font-bold text-white">Call of Duty Mobile</h3>
                </div>
                
                <p className="text-gray-300 mb-6 text-lg">
                  Tactical shooter featuring both classic multiplayer modes and a battle royale experience. Choose from a variety of game modes including Team Deathmatch and Battle Royale.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Trophy className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Competition Types</h4>
                    <p className="text-gray-400 text-sm">Team Deathmatch, Battle Royale</p>
                  </div>
                  
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Clock className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Match Duration</h4>
                    <p className="text-gray-400 text-sm">10-25 minutes</p>
                  </div>
                  
                  <div className="bg-dark-surface/50 p-4 rounded-lg">
                    <Users className="text-primary h-6 w-6 mb-2" />
                    <h4 className="text-white font-bold mb-1">Team Size</h4>
                    <p className="text-gray-400 text-sm">5v5, Battle Royale</p>
                  </div>
                </div>
                
                <Button disabled className="bg-gray-700 text-gray-300 cursor-not-allowed">
                  Tournaments Coming Soon
                </Button>
              </div>
              
              <div className="bg-gradient-to-br from-green-800/20 to-dark-card h-64 lg:h-auto flex items-center justify-center">
                <div className="text-center px-6">
                  <h3 className="text-4xl md:text-6xl font-bold text-white">COD</h3>
                  <p className="text-lg text-gray-400 mt-2">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Games Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">More Games Coming Soon</h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              We're continuously expanding our platform to include more of your favorite games
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center">
              <Gamepad className="text-primary h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Valorant Mobile</h3>
              <p className="text-gray-400">
                Tactical shooter with unique character abilities and precise gunplay
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center">
              <Gamepad className="text-primary h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Mobile Legends</h3>
              <p className="text-gray-400">
                5v5 MOBA with fast-paced matches and diverse heroes
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center">
              <Gamepad className="text-primary h-12 w-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Apex Legends Mobile</h3>
              <p className="text-gray-400">
                Hero-based battle royale with unique abilities and team dynamics
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-400 mb-6">
              Want to see your favorite game on our platform? Let us know!
            </p>
            <Link href="/contact">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Suggest a Game
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Game Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Tournament Features</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              What makes our tournaments special across all games
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-dark border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors">
              <Trophy className="text-primary h-10 w-10 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Cash Prizes</h3>
              <p className="text-gray-300">
                Compete for substantial cash rewards distributed to top performers
              </p>
            </div>
            
            <div className="bg-dark border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors">
              <Users className="text-primary h-10 w-10 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Team Support</h3>
              <p className="text-gray-300">
                Manage your teams across multiple games with our intuitive team system
              </p>
            </div>
            
            <div className="bg-dark border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors">
              <Clock className="text-primary h-10 w-10 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Scheduled Matches</h3>
              <p className="text-gray-300">
                Clear tournament schedules with reminders sent before your matches
              </p>
            </div>
            
            <div className="bg-dark border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors">
              <ArrowRight className="text-primary h-10 w-10 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Custom Formats</h3>
              <p className="text-gray-300">
                Various tournament formats from single elimination to round robin
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}