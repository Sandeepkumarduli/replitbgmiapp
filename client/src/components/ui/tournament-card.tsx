import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users, MapPin, User } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, format, parseISO, isPast, isToday } from "date-fns";
import { Tournament } from "@shared/schema";

type TournamentCardProps = {
  tournament: Tournament;
  onRegister?: (tournamentId: number) => void;
  registered?: boolean;
  registrationsCount?: number;
};

export function TournamentCard({ tournament, onRegister, registered = false, registrationsCount = 0 }: TournamentCardProps) {
  const { id, title, description, date, mapType, teamType, gameType = "BGMI", gameMode, isPaid, prizePool, totalSlots, status } = tournament;
  
  // Use the actual registrations count
  const slotsTaken = registrationsCount;
  
  const tournamentDate = parseISO(date.toString());
  const isPastEvent = isPast(tournamentDate) && !isToday(tournamentDate);
  const isTodayEvent = isToday(tournamentDate);
  
  const statusDisplay = () => {
    if (status === "live") {
      return (
        <div className="absolute top-0 right-0 bg-[#00CC66] text-white text-xs font-bold px-3 py-1 m-3 rounded-full flex items-center">
          <span className="status-indicator status-live"></span>LIVE NOW
        </div>
      );
    } else if (status === "upcoming") {
      return (
        <div className="absolute top-0 right-0 bg-[#FFCC00] text-dark px-3 py-1 m-3 rounded-full flex items-center">
          <span className="status-indicator status-upcoming"></span>UPCOMING
        </div>
      );
    } else {
      return (
        <div className="absolute top-0 right-0 bg-[#FF3300] text-white text-xs font-bold px-3 py-1 m-3 rounded-full flex items-center">
          <span className="status-indicator status-closed"></span>COMPLETED
        </div>
      );
    }
  };
  
  return (
    <Card className="tournament-card border border-gray-800 overflow-hidden bg-dark-card hover:bg-dark-card/90 transition-colors shadow-lg ring-1 ring-white/5 hover:ring-white/10">
      <CardContent className="p-0">
        <div className="p-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-3">
            {status === "live" ? (
              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                LIVE NOW
              </Badge>
            ) : status === "upcoming" ? (
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full mr-1.5"></span>
                UPCOMING
              </Badge>
            ) : (
              <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full mr-1.5"></span>
                COMPLETED
              </Badge>
            )}
            
            {/* Entry Fee / Prize Badge */}
            {!isPaid ? (
              <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-semibold shadow-sm">
                FREE ENTRY
              </Badge>
            ) : prizePool && prizePool > 0 ? (
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-semibold shadow-sm">
                ₹{prizePool.toLocaleString()} PRIZE
              </Badge>
            ) : null}
          </div>
          
          {/* Game Type Banner */}
          <div className="mb-3">
            <div className={`
              ${gameType === 'BGMI' ? 'bg-gradient-to-r from-gray-700 to-slate-700' : 
                gameType === 'COD' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 
                  gameType === 'FREEFIRE' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-gray-700 to-slate-700'} 
              text-white font-semibold shadow-sm py-1.5 px-3 inline-block rounded-md text-md 
              border border-white/10 mb-2
            `}>
              {gameType}
            </div>
            
            {/* Tournament Title */}
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          
          {/* Date/Time */}
          <div className="flex items-center text-gray-400 text-sm mb-3">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {isTodayEvent 
              ? `Today, ${format(tournamentDate, "h:mm a")}`
              : format(tournamentDate, "MMM d, h:mm a")
            }
          </div>
          
          {/* Tournament Details */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="flex items-center text-gray-400 text-sm">
              <Users className="h-4 w-4 mr-2" />
              {teamType}
            </div>
            <div className="flex items-center text-gray-400 text-sm">
              <MapPin className="h-4 w-4 mr-2" />
              {mapType}
            </div>
            <div className="flex items-center text-gray-400 text-sm">
              <User className="h-4 w-4 mr-2" />
              {slotsTaken}/{totalSlots}
            </div>
          </div>
          
          {/* Prize Pool */}
          {prizePool && prizePool > 0 && (
            <div className="mb-4">
              <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-indigo-800/30 rounded-md px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-300 font-medium">Prize Pool</span>
                  <span className="text-lg font-bold text-white">₹{prizePool.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Room Info for Registered Users - Now showing if registered regardless of tournament status */}
        {registered && (
          <div className="border-t border-indigo-800/30 px-4 py-3 bg-gradient-to-r from-purple-900/10 to-indigo-900/10">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-indigo-300 mb-1 font-medium">Room ID</p>
                <p className="font-mono bg-dark-card px-2 py-1 rounded-sm text-sm text-white border border-indigo-800/20">
                  {tournament.roomId || "Will be available soon"}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-300 mb-1 font-medium">Password</p>
                <p className="font-mono bg-dark-card px-2 py-1 rounded-sm text-sm text-white border border-indigo-800/20">
                  {tournament.password || "Will be available soon"}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <div className="border-t border-gray-800/50 p-4 pt-3 bg-gradient-to-b from-dark-card to-dark-surface/90">
          {registered ? (
            status === "live" ? (
              <Link href={`/tournaments/${id}`}>
                <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-md">
                  View Room ID & Pass
                </Button>
              </Link>
            ) : (
              <Button className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium">
                Registered
              </Button>
            )
          ) : status === "live" ? (
            <Button className="w-full bg-gradient-to-r from-rose-600 to-red-600 text-white font-medium opacity-90" disabled>
              Match Started
            </Button>
          ) : status === "upcoming" ? (
            <Button 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-md"
              onClick={() => onRegister && onRegister(id)}
            >
              Register
            </Button>
          ) : (
            <Button className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-gray-300 font-medium opacity-80" disabled>
              Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
