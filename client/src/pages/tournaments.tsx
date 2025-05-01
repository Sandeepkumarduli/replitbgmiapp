import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TournamentListWithTabs } from "@/components/user/tournament-list";
import { Button } from "@/components/ui/button";
import { Search, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Tournaments() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-dark">
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Trophy className="mr-3 h-8 w-8 text-primary" />
              BGMI Tournaments
            </h1>
            <p className="text-gray-400 max-w-2xl">
              Browse and register for upcoming tournaments, view live matches, and check past events
            </p>
          </div>
          
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

        <div className="bg-dark-card border border-gray-800 rounded-lg p-6">
          <TournamentListWithTabs />
        </div>
      </div>
    </div>
  );
}
