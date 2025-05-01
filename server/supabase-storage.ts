import { supabase } from './supabase';
import {
  User, Team, TeamMember, Tournament, Registration,
  InsertUser, InsertTeam, InsertTeamMember, InsertTournament, InsertRegistration,
  UpdateTournament
} from '@shared/schema';
import { IStorage } from './storage';
import { PostgrestError } from '@supabase/supabase-js';

export class SupabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([insertUser])
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`);
    }
    
    return data as unknown as User;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update(userUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as User;
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as Team;
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as Team;
  }

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('ownerId', ownerId);
    
    if (error || !data) return [];
    return data as unknown as Team[];
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert([insertTeam])
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create team: ${error?.message || 'Unknown error'}`);
    }
    
    return data as unknown as Team;
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .update(teamUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as Team;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('teamId', teamId);
    
    if (error || !data) return [];
    return data as unknown as TeamMember[];
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as TeamMember;
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const { data, error } = await supabase
      .from('team_members')
      .insert([insertMember])
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to add team member: ${error?.message || 'Unknown error'}`);
    }
    
    return data as unknown as TeamMember;
  }

  async updateTeamMember(id: number, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const { data, error } = await supabase
      .from('team_members')
      .update(memberUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as TeamMember;
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
    return data as unknown as Tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('date', { ascending: true });
    
    if (error || !data) return [];
    return data as unknown as Tournament[];
  }

  async getTournamentsByStatus(status: string): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('status', status)
      .order('date', { ascending: true });
    
    if (error || !data) return [];
    return data as unknown as Tournament[];
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const { data, error } = await supabase
      .from('tournaments')
      .insert([insertTournament])
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create tournament: ${error?.message || 'Unknown error'}`);
    }
    
    return data as unknown as Tournament;
  }

  async updateTournament(id: number, tournamentUpdate: Partial<UpdateTournament>): Promise<Tournament | undefined> {
    const { data, error } = await supabase
      .from('tournaments')
      .update(tournamentUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as Tournament;
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
    return data as unknown as Registration;
  }

  async getRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('tournamentId', tournamentId);
    
    if (error || !data) return [];
    return data as unknown as Registration[];
  }

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('userId', userId);
    
    if (error || !data) return [];
    return data as unknown as Registration[];
  }

  async getRegistrationsByTeam(teamId: number): Promise<Registration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('teamId', teamId);
    
    if (error || !data) return [];
    return data as unknown as Registration[];
  }

  async checkRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('registrations')
      .select('id')
      .eq('tournamentId', tournamentId)
      .eq('teamId', teamId);
    
    if (error || !data) return false;
    return data.length > 0;
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const { data, error } = await supabase
      .from('registrations')
      .insert([insertRegistration])
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create registration: ${error?.message || 'Unknown error'}`);
    }
    
    return data as unknown as Registration;
  }

  async updateRegistration(id: number, registrationUpdate: Partial<Registration>): Promise<Registration | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .update(registrationUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) return undefined;
    return data as unknown as Registration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', id);
    
    return !error;
  }
}