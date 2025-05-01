import { 
  users, teams, teamMembers, tournaments, registrations,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration
} from "@shared/schema";
import { IStorage } from "./storage";
import { supabase } from "./supabase";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class SupabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Use memory store for sessions
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(insertUser)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to create user');
    }
    
    return data as User;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update(userUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });
    
    if (error || !data) return [];
    return data as User[];
  }
  
  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Team;
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error || !data) return undefined;
    return data as Team;
  }

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('ownerId', ownerId);
    
    if (error || !data) return [];
    return data as Team[];
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert(insertTeam)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to create team');
    }
    
    return data as Team;
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .update(teamUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as Team;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  async getAllTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('id', { ascending: true });
    
    if (error || !data) return [];
    return data as Team[];
  }
  
  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('teamId', teamId);
    
    if (error || !data) return [];
    return data as TeamMember[];
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as TeamMember;
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const { data, error } = await supabase
      .from('team_members')
      .insert(insertMember)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to add team member');
    }
    
    return data as TeamMember;
  }

  async updateTeamMember(id: number, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const { data, error } = await supabase
      .from('team_members')
      .update(memberUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as TeamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  // Tournament operations
  async getTournament(id: number): Promise<Tournament | undefined> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('date', { ascending: true });
    
    if (error || !data) return [];
    return data as Tournament[];
  }

  async getTournamentsByStatus(status: string): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('status', status)
      .order('date', { ascending: true });
    
    if (error || !data) return [];
    return data as Tournament[];
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const { data, error } = await supabase
      .from('tournaments')
      .insert(insertTournament)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to create tournament');
    }
    
    return data as Tournament;
  }

  async updateTournament(id: number, tournamentUpdate: Partial<UpdateTournament>): Promise<Tournament | undefined> {
    const { data, error } = await supabase
      .from('tournaments')
      .update(tournamentUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as Tournament;
  }

  async deleteTournament(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  // Registration operations
  async getRegistration(id: number): Promise<Registration | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Registration;
  }

  async getRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('tournamentId', tournamentId);
    
    if (error || !data) return [];
    return data as Registration[];
  }

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('userId', userId);
    
    if (error || !data) return [];
    return data as Registration[];
  }

  async getRegistrationsByTeam(teamId: number): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('teamId', teamId);
    
    if (error || !data) return [];
    return data as Registration[];
  }

  async checkRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('registrations')
      .select('id')
      .eq('tournamentId', tournamentId)
      .eq('teamId', teamId)
      .single();
    
    return !error && !!data;
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const { data, error } = await supabase
      .from('registrations')
      .insert(insertRegistration)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to create registration');
    }
    
    return data as Registration;
  }

  async updateRegistration(id: number, registrationUpdate: Partial<Registration>): Promise<Registration | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .update(registrationUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as Registration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', id);
    
    return !error;
  }
}