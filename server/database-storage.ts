import { 
  users, teams, teamMembers, tournaments, registrations,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Set up session store with PostgreSQL
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Use PostgreSQL for session storage
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set(userUpdate)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Before deletion, check if the user exists
      const user = await this.getUser(id);
      if (!user) return false;
      
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.id));
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));
    return team;
  }

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.ownerId, ownerId));
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    try {
      const [team] = await db.insert(teams).values(insertTeam).returning();
      return team;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    try {
      const [updatedTeam] = await db.update(teams)
        .set(teamUpdate)
        .where(eq(teams.id, id))
        .returning();
      return updatedTeam;
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  }

  async deleteTeam(id: number): Promise<boolean> {
    try {
      // Before deletion, check if the team exists
      const team = await this.getTeam(id);
      if (!team) return false;
      
      await db.delete(teams).where(eq(teams.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    }
  }
  
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(asc(teams.id));
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
  }
  
  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id));
    return member;
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    try {
      const [member] = await db.insert(teamMembers)
        .values(insertMember)
        .returning();
      return member;
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  async updateTeamMember(id: number, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    try {
      const [updatedMember] = await db.update(teamMembers)
        .set(memberUpdate)
        .where(eq(teamMembers.id, id))
        .returning();
      return updatedMember;
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    try {
      // Before deletion, check if the team member exists
      const member = await this.getTeamMember(id);
      if (!member) return false;
      
      await db.delete(teamMembers).where(eq(teamMembers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting team member:', error);
      return false;
    }
  }

  // Tournament operations
  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select()
      .from(tournaments)
      .where(eq(tournaments.id, id));
    return tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db.select()
      .from(tournaments)
      .orderBy(asc(tournaments.date));
  }

  async getTournamentsByStatus(status: string): Promise<Tournament[]> {
    return await db.select()
      .from(tournaments)
      .where(eq(tournaments.status, status))
      .orderBy(asc(tournaments.date));
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    try {
      // Ensure slots is set to the same value as totalSlots for compatibility
      const tournamentData = {
        ...insertTournament,
        slots: insertTournament.totalSlots
      };
      
      const [tournament] = await db.insert(tournaments)
        .values(tournamentData)
        .returning();
      return tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  async updateTournament(id: number, tournamentUpdate: Partial<UpdateTournament>): Promise<Tournament | undefined> {
    try {
      // If totalSlots is being updated, also update slots for compatibility
      if (tournamentUpdate.totalSlots) {
        tournamentUpdate.slots = tournamentUpdate.totalSlots;
      }
      
      const [updatedTournament] = await db.update(tournaments)
        .set(tournamentUpdate)
        .where(eq(tournaments.id, id))
        .returning();
      return updatedTournament;
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
  }

  async deleteTournament(id: number): Promise<boolean> {
    try {
      // Before deletion, check if the tournament exists
      const tournament = await this.getTournament(id);
      if (!tournament) return false;
      
      await db.delete(tournaments).where(eq(tournaments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      return false;
    }
  }

  // Registration operations
  async getRegistration(id: number): Promise<Registration | undefined> {
    const [registration] = await db.select()
      .from(registrations)
      .where(eq(registrations.id, id));
    return registration;
  }

  async getRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
    return await db.select()
      .from(registrations)
      .where(eq(registrations.tournamentId, tournamentId));
  }

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    return await db.select()
      .from(registrations)
      .where(eq(registrations.userId, userId));
  }

  async getRegistrationsByTeam(teamId: number): Promise<Registration[]> {
    return await db.select()
      .from(registrations)
      .where(eq(registrations.teamId, teamId));
  }

  async checkRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    const [registration] = await db.select({ id: registrations.id })
      .from(registrations)
      .where(and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.teamId, teamId)
      ));
    return !!registration;
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    try {
      // Assign slot number
      const existingRegistrations = await this.getRegistrationsByTournament(insertRegistration.tournamentId);
      const maxSlot = existingRegistrations.length > 0 
        ? Math.max(...existingRegistrations.map(r => r.slot || 0))
        : 0;
      
      const registrationData = {
        ...insertRegistration,
        slot: maxSlot + 1
      };
      
      const [registration] = await db.insert(registrations)
        .values(registrationData)
        .returning();
      return registration;
    } catch (error) {
      console.error('Error creating registration:', error);
      throw error;
    }
  }

  async updateRegistration(id: number, registrationUpdate: Partial<Registration>): Promise<Registration | undefined> {
    const [updatedRegistration] = await db.update(registrations)
      .set(registrationUpdate)
      .where(eq(registrations.id, id))
      .returning();
    return updatedRegistration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    try {
      // Before deletion, check if the registration exists
      const registration = await this.getRegistration(id);
      if (!registration) return false;
      
      await db.delete(registrations).where(eq(registrations.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting registration:', error);
      return false;
    }
  }
}