import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TournamentList } from "@/components/user/tournament-list";
import { CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-dark text-white font-poppins">
      {/* Hero Section */}
      <div className="hero-bg py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-primary">BGMI</span> Tournament Platform
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Join competitive tournaments, create teams, and battle for glory in Battlegrounds Mobile India
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/signup" className="inline-block">
                <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md text-lg font-medium glow-hover">
                  Register Now
                </Button>
              </Link>
              <Link href="/tournaments" className="inline-block">
                <Button variant="outline" className="bg-dark-surface hover:bg-dark-card border border-primary text-white px-8 py-3 rounded-md text-lg font-medium glow-hover">
                  View Tournaments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Live Tournaments Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">
              <span className="inline-block mr-2 text-[#00CC66]">●</span> Live Tournaments
            </h2>
            <Link href="/tournaments" className="text-accent hover:text-accent/80 font-medium">
              View All <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>

          <TournamentList filter="live" limit={2} />
        </div>
      </section>

      {/* Upcoming Tournaments Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-dark-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">
              <span className="inline-block mr-2 text-[#FFCC00]">●</span> Upcoming Tournaments
            </h2>
            <Link href="/tournaments" className="text-accent hover:text-accent/80 font-medium">
              View All <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>

          <TournamentList filter="upcoming" limit={3} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join our platform, compete in tournaments, and win exclusive prizes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="bg-dark-surface rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-primary">
                <i className="fas fa-user-plus text-primary text-3xl"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Create Account</h3>
              <p className="text-gray-400">Register with your unique username and BGMI game ID to get started</p>
            </div>

            <div className="text-center">
              <div className="bg-dark-surface rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-primary">
                <i className="fas fa-users text-primary text-3xl"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Build Your Team</h3>
              <p className="text-gray-400">Create your team by adding up to 4 players plus substitutes</p>
            </div>

            <div className="text-center">
              <div className="bg-dark-surface rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6 border border-primary">
                <i className="fas fa-trophy text-primary text-3xl"></i>
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
                  <div className="flex-shrink-0 h-6 w-6 text-accent">
                    <CheckCircle />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    View all registered tournaments in one place
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-accent">
                    <CheckCircle />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    Create and manage your personal profile with unique username
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-accent">
                    <CheckCircle />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    Build your team with up to 4 players and substitutes
                  </p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 text-accent">
                    <CheckCircle />
                  </div>
                  <p className="ml-3 text-lg text-gray-300">
                    Track your tournament results and team performance
                  </p>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/user/dashboard" className="inline-block">
                  <Button className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-md glow-hover">
                    Try User Dashboard
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-dark-card border border-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-bold text-white">Your Registered Tournaments</h4>
                <span className="text-gray-400">3 Tournaments</span>
              </div>
              <div className="space-y-4">
                <div className="bg-dark-surface p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                  <div>
                    <h5 className="text-white font-medium">BGMI Pro League</h5>
                    <p className="text-gray-400 text-sm">Today, 5:30 PM • Squad</p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block mr-2 status-indicator status-live"></span>
                    <span className="text-[#00CC66] text-sm font-medium">LIVE</span>
                  </div>
                </div>
                <div className="bg-dark-surface p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                  <div>
                    <h5 className="text-white font-medium">Weekend Warriors</h5>
                    <p className="text-gray-400 text-sm">Today, 6:00 PM • Duo</p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block mr-2 status-indicator status-live"></span>
                    <span className="text-[#00CC66] text-sm font-medium">LIVE</span>
                  </div>
                </div>
                <div className="bg-dark-surface p-4 rounded-lg border border-gray-800 flex justify-between items-center">
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
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Join BGMI Tournaments?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Create an account, build your team, and start competing in exciting tournaments today
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/signup" className="inline-block">
              <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md text-lg font-medium glow-hover">
                Create Account
              </Button>
            </Link>
            <Link href="/tournaments" className="inline-block">
              <Button variant="outline" className="bg-dark hover:bg-dark-card border border-primary text-white px-8 py-3 rounded-md text-lg font-medium glow-hover">
                Browse Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}