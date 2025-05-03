import { 
  users, teams, teamMembers, tournaments, registrations, notifications,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration,
  type Notification, type InsertNotification
} from "@shared/schema";
import session from "express-session";

export interface IStorage {
  // Session storage
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>; // For admin user management
  getAllUsers(): Promise<User[]>; // For admin user management
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  getTeamByInviteCode(inviteCode: string): Promise<Team | undefined>;
  getTeamsByOwnerId(ownerId: number): Promise<Team[]>;
  createTeam(team: InsertTeam & { inviteCode: string }): Promise<Team>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  getAllTeams(): Promise<Team[]>; // For admin team management
  
  // Team member operations
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, member: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
  
  // Tournament operations
  getTournament(id: number): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  getTournamentsByStatus(status: string): Promise<Tournament[]>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: number, tournament: Partial<UpdateTournament>): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;
  
  // Registration operations
  getRegistration(id: number): Promise<Registration | undefined>;
  getRegistrationsByTournament(tournamentId: number): Promise<Registration[]>;
  getRegistrationsByUser(userId: number): Promise<Registration[]>;
  getRegistrationsByTeam(teamId: number): Promise<Registration[]>;
  checkRegistration(tournamentId: number, teamId: number): Promise<boolean>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  updateRegistration(id: number, registration: Partial<Registration>): Promise<Registration | undefined>;
  deleteRegistration(id: number): Promise<boolean>;
  
  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  getBroadcastNotifications(): Promise<Notification[]>; // Notifications for all users
  getUnreadNotificationsCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
  deleteAllUserNotifications(userId: number): Promise<number>; // Delete all notifications for a user
  cleanupOldNotifications(olderThan: Date): Promise<number>; // Returns count of deleted notifications
}

import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private tournaments: Map<number, Tournament>;
  private registrations: Map<number, Registration>;
  private notifications: Map<number, Notification>;
  
  private userId: number;
  private teamId: number;
  private teamMemberId: number;
  private tournamentId: number;
  private registrationId: number;
  private notificationId: number;

  // Session store for express-session
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.tournaments = new Map();
    this.registrations = new Map();
    this.notifications = new Map();
    
    this.userId = 1;
    this.teamId = 1;
    this.teamMemberId = 1;
    this.tournamentId = 1;
    this.registrationId = 1;
    this.notificationId = 1;
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Add a default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@bgmi.com",
      phone: "1234567890",
      gameId: "ADMIN001",
      role: "admin"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt,
      role: insertUser.role || "user"
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.name.toLowerCase() === name.toLowerCase(),
    );
  }
  
  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.inviteCode === inviteCode,
    );
  }

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(
      (team) => team.ownerId === ownerId,
    );
  }

  async createTeam(insertTeam: InsertTeam & { inviteCode: string }): Promise<Team> {
    const id = this.teamId++;
    const createdAt = new Date();
    const team: Team = { ...insertTeam, id, createdAt };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam = { ...team, ...teamUpdate };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    return this.teams.delete(id);
  }
  
  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.teamId === teamId,
    );
  }
  
  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.teamMemberId++;
    const createdAt = new Date();
    const member: TeamMember = { 
      ...insertMember, 
      id, 
      createdAt,
      role: insertMember.role || "member"
    };
    this.teamMembers.set(id, member);
    return member;
  }

  async updateTeamMember(id: number, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const member = this.teamMembers.get(id);
    if (!member) return undefined;
    
    const updatedMember = { ...member, ...memberUpdate };
    this.teamMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  // Tournament operations
  async getTournament(id: number): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return Array.from(this.tournaments.values());
  }

  async getTournamentsByStatus(status: string): Promise<Tournament[]> {
    return Array.from(this.tournaments.values()).filter(
      (tournament) => tournament.status === status,
    );
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const id = this.tournamentId++;
    const createdAt = new Date();
    
    // Set default values with proper typing
    const tournament: Tournament = { 
      id,
      title: insertTournament.title,
      description: insertTournament.description,
      date: insertTournament.date,
      mapType: insertTournament.mapType,
      gameType: insertTournament.gameType || "Squad", // New field with default
      teamType: insertTournament.teamType,
      isPaid: insertTournament.isPaid,
      totalSlots: insertTournament.totalSlots,
      slots: insertTournament.totalSlots, // Alias for totalSlots
      createdBy: insertTournament.createdBy,
      status: insertTournament.status || "upcoming",
      entryFee: insertTournament.entryFee || 0,
      prizePool: insertTournament.prizePool || 0,
      createdAt: createdAt,
      roomId: null,
      password: null
    };
    
    this.tournaments.set(id, tournament);
    return tournament;
  }

  async updateTournament(id: number, tournamentUpdate: Partial<UpdateTournament>): Promise<Tournament | undefined> {
    const tournament = this.tournaments.get(id);
    if (!tournament) return undefined;
    
    const updatedTournament = { ...tournament, ...tournamentUpdate };
    this.tournaments.set(id, updatedTournament);
    return updatedTournament;
  }

  async deleteTournament(id: number): Promise<boolean> {
    return this.tournaments.delete(id);
  }

  // Registration operations
  async getRegistration(id: number): Promise<Registration | undefined> {
    return this.registrations.get(id);
  }

  async getRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(
      (registration) => registration.tournamentId === tournamentId,
    );
  }

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(
      (registration) => registration.userId === userId,
    );
  }

  async getRegistrationsByTeam(teamId: number): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(
      (registration) => registration.teamId === teamId,
    );
  }

  async checkRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    return Array.from(this.registrations.values()).some(
      (registration) => registration.tournamentId === tournamentId && registration.teamId === teamId,
    );
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const id = this.registrationId++;
    const registeredAt = new Date();
    
    // Assign a slot number
    const tournamentRegistrations = await this.getRegistrationsByTournament(insertRegistration.tournamentId);
    const maxSlot = tournamentRegistrations.length > 0 
      ? Math.max(...tournamentRegistrations.map(r => r.slot || 0))
      : 0;
    const slot = maxSlot + 1;
    
    const registration: Registration = { ...insertRegistration, id, registeredAt, slot };
    this.registrations.set(id, registration);
    return registration;
  }

  async updateRegistration(id: number, registrationUpdate: Partial<Registration>): Promise<Registration | undefined> {
    const registration = this.registrations.get(id);
    if (!registration) return undefined;
    
    const updatedRegistration = { ...registration, ...registrationUpdate };
    this.registrations.set(id, updatedRegistration);
    return updatedRegistration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    return this.registrations.delete(id);
  }

  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId || notification.userId === null
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first
  }

  async getBroadcastNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === null
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (notification) => (notification.userId === userId || notification.userId === null) && !notification.isRead
    ).length;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const createdAt = new Date();
    const notification: Notification = {
      ...insertNotification,
      id,
      createdAt,
      isRead: false
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    const userNotifications = await this.getUserNotifications(userId);
    
    userNotifications.forEach(notification => {
      if (!notification.isRead) {
        this.notifications.set(notification.id, { ...notification, isRead: true });
      }
    });
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }
  
  async cleanupOldNotifications(olderThan: Date): Promise<number> {
    const notificationsToDelete = Array.from(this.notifications.values())
      .filter(notification => notification.createdAt < olderThan);
    
    // Delete each old notification
    let deletedCount = 0;
    for (const notification of notificationsToDelete) {
      if (this.notifications.delete(notification.id)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  // Delete all notifications for a specific user
  async deleteAllUserNotifications(userId: number): Promise<number> {
    const notificationsToDelete = Array.from(this.notifications.values())
      .filter(notification => 
        notification.userId === userId // Only delete the user's personal notifications
        // Don't delete broadcast notifications for everyone
      );
    
    // Delete each notification
    let deletedCount = 0;
    for (const notification of notificationsToDelete) {
      if (this.notifications.delete(notification.id)) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Import storage implementations
import { SupabaseStorage } from './supabase-storage';
import { DatabaseStorage } from './database-storage';

// Choose which storage implementation to use
// Production: PostgreSQL database (default)
// Supabase: When USE_SUPABASE is set to 'true'
// In-memory: When USE_MEMORY_STORAGE is set to 'true' (for development)
const useSupabase = process.env.USE_SUPABASE === 'true';
const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';

// Select the appropriate storage implementation based on environment variables
let selectedStorage: IStorage;

if (useMemoryStorage) {
  console.log('Using in-memory storage (for development only)');
  selectedStorage = new MemStorage();
} else if (useSupabase) {
  console.log('Using Supabase storage');
  selectedStorage = new SupabaseStorage();
} else {
  console.log('Using PostgreSQL database storage (production)');
  selectedStorage = new DatabaseStorage();
}

// Export the selected storage implementation
export const storage = selectedStorage;
