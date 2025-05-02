import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Medal, Award, Check, Target } from "lucide-react";

export default function AboutPage() {
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
              About <span className="text-primary">RD TOURNAMENTS</span> HUB
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Leading the way in competitive gaming experiences across multiple gaming platforms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16">
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <div className="bg-dark-surface rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-primary">
                <Trophy className="text-primary h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Premier Tournaments</h3>
              <p className="text-gray-400">
                Host to some of the most competitive and exciting gaming tournaments for BGMI, FREEFIRE, and COD
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <div className="bg-dark-surface rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-primary">
                <Users className="text-primary h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Vibrant Community</h3>
              <p className="text-gray-400">
                Join thousands of passionate gamers who compete, connect and collaborate on our platform
              </p>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <div className="bg-dark-surface rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-primary">
                <Medal className="text-primary h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Exclusive Rewards</h3>
              <p className="text-gray-400">
                Earn substantial cash prizes and exclusive in-game rewards for top tournament performances
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Our Story</h2>
              <p className="text-gray-300 mb-6">
                Founded in 2022, RD TOURNAMENTS HUB began with a simple mission: to create the ultimate competitive platform for mobile gamers. What started as small, casual tournaments among friends has grown into one of the most trusted tournament platforms in the gaming community.
              </p>
              <p className="text-gray-300 mb-6">
                Our passion for gaming excellence drives us to constantly improve and expand our offerings. Today, we host hundreds of tournaments across multiple game titles, providing players with opportunities to showcase their skills, connect with fellow gaming enthusiasts, and win substantial rewards.
              </p>
              <p className="text-gray-300">
                As we continue to grow, our commitment to fair play, seamless tournament experiences, and community engagement remains unchanged. We're dedicated to supporting the esports ecosystem and helping talented players reach their full potential.
              </p>
            </div>
            <div className="md:w-1/2 bg-dark-card rounded-lg p-6 border border-gray-800">
              <div className="bg-dark-surface p-6 rounded-lg">
                <div className="flex items-center mb-6">
                  <Award className="text-primary h-12 w-12 mr-4" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Our Mission</h3>
                    <p className="text-gray-400">Empowering gamers to compete at their highest level</p>
                  </div>
                </div>
                
                <h4 className="text-white font-semibold mb-4">What We Value:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="text-primary h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Fair and transparent competition for all players</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="text-primary h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Community-first approach to tournament design</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="text-primary h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Innovation in competitive gaming formats</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="text-primary h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Recognition and rewards for skilled players</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Our Games Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Our Games</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We host competitive tournaments across these popular titles
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-dark-card border border-gray-800 rounded-xl p-6 hover:border-primary transition-colors">
              <div className="h-48 bg-gradient-to-b from-blue-900/50 to-dark-card rounded-lg flex items-center justify-center mb-6">
                <h3 className="text-3xl font-bold text-white">BGMI</h3>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Battlegrounds Mobile India</h4>
              <p className="text-gray-400 mb-4">
                The premier battle royale experience with intense 100-player matches across various maps.
              </p>
              <div className="flex items-center text-gray-500 text-sm">
                <span className="px-2 py-1 bg-dark-surface rounded-full mr-2">Squad</span>
                <span className="px-2 py-1 bg-dark-surface rounded-full mr-2">Duo</span>
                <span className="px-2 py-1 bg-dark-surface rounded-full">Solo</span>
              </div>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-xl p-6 hover:border-primary transition-colors">
              <div className="h-48 bg-gradient-to-b from-red-900/50 to-dark-card rounded-lg flex items-center justify-center mb-6">
                <h3 className="text-3xl font-bold text-white">FREEFIRE</h3>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Garena Free Fire</h4>
              <p className="text-gray-400 mb-4">
                Fast-paced battle royale with unique character abilities and intense 10-minute matches.
              </p>
              <div className="flex items-center text-gray-500 text-sm">
                <span className="px-2 py-1 bg-dark-surface rounded-full mr-2">Squad</span>
                <span className="px-2 py-1 bg-dark-surface rounded-full mr-2">Duo</span>
                <span className="px-2 py-1 bg-dark-surface rounded-full">Solo</span>
              </div>
            </div>
            
            <div className="bg-dark-card border border-gray-800 rounded-xl p-6 hover:border-primary transition-colors">
              <div className="h-48 bg-gradient-to-b from-green-900/50 to-dark-card rounded-lg flex items-center justify-center mb-6">
                <h3 className="text-3xl font-bold text-white">COD</h3>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Call of Duty Mobile</h4>
              <p className="text-gray-400 mb-4">
                Tactical shooter featuring both multiplayer modes and a battle royale experience.
              </p>
              <div className="flex items-center text-gray-500 text-sm">
                <span className="px-2 py-1 bg-dark-surface rounded-full mr-2">Team Deathmatch</span>
                <span className="px-2 py-1 bg-dark-surface rounded-full">Battle Royale</span>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-6">More games coming soon to our platform!</p>
            <Link href="/games">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Explore All Games
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Future Vision Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Our Vision for the Future</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Where we're headed and how we plan to expand the RD TOURNAMENTS HUB
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-dark border border-gray-800 rounded-lg p-8 hover:border-primary transition-colors">
              <Target className="text-primary h-12 w-12 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Expanding to New Regions</h3>
              <p className="text-gray-300 mb-4">
                We're working to bring our tournament platform to more regions across India and beyond, connecting gamers from diverse backgrounds and creating a truly global gaming community.
              </p>
              <p className="text-gray-300">
                Our goal is to host region-specific events that cater to local communities while also providing opportunities for cross-regional competition at the highest levels.
              </p>
            </div>
            
            <div className="bg-dark border border-gray-800 rounded-lg p-8 hover:border-primary transition-colors">
              <Trophy className="text-primary h-12 w-12 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4">Bigger Tournaments, Greater Rewards</h3>
              <p className="text-gray-300 mb-4">
                We're scaling up our tournament operations to offer larger prize pools, more prestigious events, and enhanced visibility for top performers in our tournaments.
              </p>
              <p className="text-gray-300">
                Our partnerships with gaming publishers and sponsors will help us create premium tournament experiences that rival traditional esports events.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Join the Competition?</h2>
          <p className="text-xl text-gray-300 mb-10">
            Create an account today and start your journey in competitive gaming with RD TOURNAMENTS HUB
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md text-lg font-medium">
                Register Now
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="outline" className="bg-dark hover:bg-dark-card border border-gray-700 text-white px-8 py-3 rounded-md text-lg font-medium">
                Browse Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}