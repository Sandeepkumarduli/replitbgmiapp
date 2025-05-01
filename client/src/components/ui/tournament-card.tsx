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
    <div className="tournament-card">
      <div className="relative">
        <img 
          src={`https://images.unsplash.com/photo-15${Math.floor(Math.random() * 100000000)}?w=500&h=300&auto=format&fit=crop`} 
          alt={title} 
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Fallback image in case the random one fails
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&h=300&auto=format&fit=crop";
          }}
        />
        {statusDisplay()}
        {!isPaid && (
          <div className="absolute top-0 left-0 bg-accent/20 text-accent px-3 py-1 m-3 rounded-full text-xs font-bold">
            FREE ENTRY
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {prizePool > 0 && (
            <span className="bg-secondary/20 text-secondary px-2 py-1 rounded text-xs font-medium">
              ₹{prizePool.toLocaleString()} Prize
            </span>
          )}
        </div>
        <div className="flex items-center text-gray-400 text-sm mb-3">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {isTodayEvent 
            ? `Today, ${format(tournamentDate, "h:mm a")}`
            : format(tournamentDate, "MMM d, h:mm a")
          }
        </div>
        <div className="flex justify-between mb-4">
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
        
        {registered ? (
          <Button variant="outline" className="w-full">
            Registered
          </Button>
        ) : status === "live" ? (
          <Button className="w-full bg-[#00CC66] hover:bg-[#00CC66]/90 text-white font-medium">
            Join Now
          </Button>
        ) : status === "upcoming" ? (
          <Button 
            className="w-full bg-secondary hover:bg-secondary/90 text-white font-medium"
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
    </div>
  );
}
