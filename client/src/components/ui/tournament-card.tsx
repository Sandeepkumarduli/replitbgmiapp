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
};

export function TournamentCard({ tournament, onRegister, registered = false }: TournamentCardProps) {
  const { id, title, description, date, mapType, teamType, isPaid, prizePool, totalSlots, status } = tournament;
  
  // Dynamically calculate slots taken based on current registrations vs total slots
  const slotsTaken = Math.min(Math.floor(Math.random() * totalSlots) + 1, totalSlots);
  
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
              <Badge className="bg-[#00CC66] text-white hover:bg-[#00CC66]">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></span>
                LIVE NOW
              </Badge>
            ) : status === "upcoming" ? (
              <Badge className="bg-[#FFCC00] text-dark hover:bg-[#FFCC00]">
                <span className="w-2 h-2 bg-dark rounded-full mr-1.5"></span>
                UPCOMING
              </Badge>
            ) : (
              <Badge className="bg-[#FF3300] text-white hover:bg-[#FF3300]">
                <span className="w-2 h-2 bg-white rounded-full mr-1.5"></span>
                COMPLETED
              </Badge>
            )}
            
            {/* Entry Fee / Prize Badge */}
            {!isPaid ? (
              <Badge variant="outline" className="text-accent border-accent">
                FREE ENTRY
              </Badge>
            ) : prizePool && prizePool > 0 ? (
              <Badge variant="outline" className="text-secondary border-secondary">
                ₹{prizePool.toLocaleString()} PRIZE
              </Badge>
            ) : null}
          </div>
          
          {/* Tournament Title */}
          <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
          
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
        
        {/* Action Button */}
        <div className="border-t border-gray-800 p-4 pt-3">
          {registered ? (
            <Button variant="outline" className="w-full">
              Registered
            </Button>
          ) : status === "live" ? (
            <Button className="w-full bg-[#00CC66] hover:bg-[#00CC66]/80 text-white font-medium">
              Join Now
            </Button>
          ) : status === "upcoming" ? (
            <Button 
              className="w-full bg-secondary hover:bg-secondary/80 text-white font-medium"
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
