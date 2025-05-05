import { 
  users, teams, teamMembers, tournaments, registrations, notifications, notificationReads,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration,
  type Notification, type InsertNotification
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
  
  // Missing methods required by IStorage interface
  
  // User phone operations
  async getUserByPhone(phone: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }
  
  // Team invite code operations
  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('inviteCode', inviteCode)
      .single();
    
    if (error || !data) return undefined;
    return data as Team;
  }
  
  // Database status check
  async checkDatabaseStatus(): Promise<{ status: string, userCount: number, tables: string[] }> {
    try {
      // Check if we can connect to the database
      const { data: tablesData, error: tablesError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact', head: true });
        
      if (tablesError) {
        return {
          status: 'error',
          userCount: 0,
          tables: []
        };
      }
      
      // Get list of tables
      const tables = ['users', 'teams', 'team_members', 'tournaments', 'registrations', 'notifications'];
      
      // Count users
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        return {
          status: 'warning',
          userCount: 0,
          tables
        };
      }
      
      return {
        status: 'connected',
        userCount: count || 0,
        tables
      };
    } catch (error) {
      console.error('Database status check error:', error);
      return {
        status: 'error',
        userCount: 0,
        tables: []
      };
    }
  }
  
  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Notification;
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`userId.eq.${userId},userId.is.null`)
      .order('createdAt', { ascending: false });
    
    if (error || !data) return [];
    return data as Notification[];
  }
  
  async getBroadcastNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .is('userId', null)
      .order('createdAt', { ascending: false });
    
    if (error || !data) return [];
    return data as Notification[];
  }
  
  async getUnreadNotificationsCount(userId: number): Promise<number> {
    try {
      // Get all notifications for this user
      const userNotifications = await this.getUserNotifications(userId);
      
      // Get all notification IDs the user has already read
      const { data: readData, error: readError } = await supabase
        .from('notification_reads')
        .select('notificationId')
        .eq('userId', userId);
      
      if (readError) return userNotifications.length;
      
      // Extract the notification IDs
      const readNotificationIds = readData ? readData.map((item: {notificationId: number}) => item.notificationId) : [];
      
      // Count notifications that haven't been read
      const unreadCount = userNotifications.filter(
        notification => !readNotificationIds.includes(notification.id)
      ).length;
      
      return unreadCount;
    } catch (error) {
      console.error('Error getting unread notifications count:', error);
      return 0;
    }
  }
  
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(insertNotification)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to create notification');
    }
    
    return data as Notification;
  }
  
  async markNotificationAsRead(id: number, userId: number): Promise<Notification | undefined> {
    try {
      // First, get the notification
      const notification = await this.getNotification(id);
      if (!notification) return undefined;
      
      // Insert a record in the notification_reads table
      const { error } = await supabase
        .from('notification_reads')
        .insert({
          userId,
          notificationId: id
        });
      
      if (error) {
        console.error('Error marking notification as read:', error);
        return undefined;
      }
      
      return notification;
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      return undefined;
    }
  }
  
  async hasUserReadNotification(userId: number, notificationId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('notification_reads')
      .select('id')
      .eq('userId', userId)
      .eq('notificationId', notificationId)
      .single();
    
    return !error && !!data;
  }
  
  async getUserReadNotifications(userId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from('notification_reads')
      .select('notificationId')
      .eq('userId', userId);
    
    if (error || !data) return [];
    return data.map(item => item.notificationId);
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      // Get all notifications for this user
      const userNotifications = await this.getUserNotifications(userId);
      
      // Get all notification IDs the user has already read
      const readNotificationIds = await this.getUserReadNotifications(userId);
      
      // Filter out notifications that are already read
      const unreadNotifications = userNotifications.filter(
        notification => !readNotificationIds.includes(notification.id)
      );
      
      // Mark each unread notification as read
      const readEntries = unreadNotifications.map(notification => ({
        userId,
        notificationId: notification.id
      }));
      
      if (readEntries.length > 0) {
        await supabase
          .from('notification_reads')
          .insert(readEntries);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    return !error;
  }
  
  async cleanupOldNotifications(olderThan: Date): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('createdAt', olderThan.toISOString())
        .select('id');
      
      if (error) {
        console.error('Error cleaning up old notifications:', error);
        return 0;
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error);
      return 0;
    }
  }
  
  async deleteAllUserNotifications(userId: number): Promise<number> {
    try {
      // First, get all notification IDs for this user
      const { data: notifications, error: fetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('userId', userId);
      
      if (fetchError || !notifications || notifications.length === 0) {
        return 0;
      }
      
      // Delete the notifications
      const { data: deletedData, error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('userId', userId)
        .select('id');
      
      if (deleteError) {
        console.error('Error deleting user notifications:', deleteError);
        return 0;
      }
      
      return deletedData?.length || 0;
    } catch (error) {
      console.error('Error in deleteAllUserNotifications:', error);
      return 0;
    }
  }
}