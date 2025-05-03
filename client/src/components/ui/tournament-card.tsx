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
    <Card className="tournament-card border border-gray-800 overflow-hidden bg-dark-card hover:bg-dark-card/80 transition-colors">
      <CardContent className="p-0">
        <div className="p-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-3">
            {status === "live" ? (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                LIVE NOW
              </Badge>
            ) : status === "upcoming" ? (
              <Badge className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold shadow-sm">
                <span className="w-2 h-2 bg-white rounded-full mr-1.5"></span>
                UPCOMING
              </Badge>
            ) : (
              <Badge className="bg-gradient-to-r from-rose-600 to-pink-500 text-white font-semibold shadow-sm">
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
          
          {/* Tournament Title with Game Type Badge */}
          <div className="flex items-center mb-3">
            <h3 className="text-xl font-bold text-white mr-2">{title}</h3>
            <Badge className={`
              ${gameType === 'BGMI' ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600' : 
                gameType === 'COD' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 
                  gameType === 'FREEFIRE' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-fuchsia-600 to-pink-600'} 
              text-white font-semibold shadow-sm
            `}>
              {gameType}
            </Badge>
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
          <div className="grid grid-cols-3 gap-2 mb-4">
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
        </div>
        
        {/* Room Info for Registered Users - Now showing if registered regardless of tournament status */}
        {registered && (
          <div className="border-t border-gray-800 px-4 py-3 bg-dark-surface/60">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">Room ID</p>
                <p className="font-mono bg-dark-card px-2 py-1 rounded-sm text-sm text-white">
                  {tournament.roomId || "Will be available soon"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Password</p>
                <p className="font-mono bg-dark-card px-2 py-1 rounded-sm text-sm text-white">
                  {tournament.password || "Will be available soon"}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <div className="border-t border-gray-800 p-4 pt-3">
          {registered ? (
            <Button variant="outline" className="w-full">
              Registered
            </Button>
          ) : status === "live" ? (
            <Button className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
              Join Now
            </Button>
          ) : status === "upcoming" ? (
            <Button 
              className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium"
              onClick={() => onRegister && onRegister(id)}
            >
              Register
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
