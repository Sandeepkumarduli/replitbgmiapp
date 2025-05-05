import { 
  users, teams, teamMembers, tournaments, registrations, notifications, admins,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration,
  type Notification, type InsertNotification,
  type Admin, type InsertAdmin
} from "@shared/schema";
import { IStorage } from "./storage";
import { db, pool } from "./neon-db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

// Create the PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export class NeonDBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
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

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const [deletedUser] = await db.delete(users).where(eq(users.id, id)).returning();
    return !!deletedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Admin methods
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async updateAdmin(id: number, adminUpdate: Partial<Admin>): Promise<Admin | undefined> {
    const [updatedAdmin] = await db
      .update(admins)
      .set(adminUpdate)
      .where(eq(admins.id, id))
      .returning();
    return updatedAdmin;
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const [deletedAdmin] = await db.delete(admins).where(eq(admins.id, id)).returning();
    return !!deletedAdmin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins);
  }

  // Diagnostic method
  async checkDatabaseStatus(): Promise<{ status: string, userCount: number, tables: string[] }> {
    try {
      // Check user count
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      
      // Check available tables by querying information_schema
      const tableResults = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tables = tableResults.rows.map((row: any) => row.table_name);
      
      return {
        status: 'connected',
        userCount: userCount[0]?.count || 0,
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

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));
    return team;
  }

  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode));
    return team;
  }

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.ownerId, ownerId));
  }

  async createTeam(insertTeam: InsertTeam & { inviteCode: string, description?: string }): Promise<Team> {
    // Ensure description has a default value if not provided
    const teamData = {
      ...insertTeam,
      description: insertTeam.description || ''
    };
    
    const [team] = await db.insert(teams).values(teamData).returning();
    return team;
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const [updatedTeam] = await db
      .update(teams)
      .set(teamUpdate)
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const [deletedTeam] = await db.delete(teams).where(eq(teams.id, id)).returning();
    return !!deletedTeam;
  }

  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  // Team Member methods
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(insertMember).returning();
    return member;
  }

  async updateTeamMember(id: number, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set(memberUpdate)
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const [deletedMember] = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    return !!deletedMember;
  }

  // Tournament methods
  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments).orderBy(tournaments.date);
  }

  async getTournamentsByStatus(status: string): Promise<Tournament[]> {
    return await db.select().from(tournaments).where(eq(tournaments.status, status)).orderBy(tournaments.date);
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const [tournament] = await db.insert(tournaments).values(insertTournament).returning();
    return tournament;
  }

  async updateTournament(id: number, tournamentUpdate: Partial<UpdateTournament>): Promise<Tournament | undefined> {
    const [updatedTournament] = await db
      .update(tournaments)
      .set(tournamentUpdate)
      .where(eq(tournaments.id, id))
      .returning();
    return updatedTournament;
  }

  async deleteTournament(id: number): Promise<boolean> {
    const [deletedTournament] = await db.delete(tournaments).where(eq(tournaments.id, id)).returning();
    return !!deletedTournament;
  }

  // Registration methods
  async getRegistration(id: number): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration;
  }

  async getRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
    return await db.select().from(registrations).where(eq(registrations.tournamentId, tournamentId));
  }

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    return await db.select().from(registrations).where(eq(registrations.userId, userId));
  }

  async getRegistrationsByTeam(teamId: number): Promise<Registration[]> {
    return await db.select().from(registrations).where(eq(registrations.teamId, teamId));
  }

  async checkRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    const [registration] = await db
      .select()
      .from(registrations)
      .where(and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.teamId, teamId)
      ));
    return !!registration;
  }

  async createRegistration(insertRegistration: InsertRegistration & { status?: string, paymentStatus?: string }): Promise<Registration> {
    // Ensure status and paymentStatus have defaults if not provided
    const regData = {
      ...insertRegistration,
      status: insertRegistration.status || 'pending',
      paymentStatus: insertRegistration.paymentStatus || 'pending'
    };
    
    const [registration] = await db.insert(registrations).values(regData).returning();
    return registration;
  }

  async updateRegistration(id: number, registrationUpdate: Partial<Registration>): Promise<Registration | undefined> {
    const [updatedRegistration] = await db
      .update(registrations)
      .set(registrationUpdate)
      .where(eq(registrations.id, id))
      .returning();
    return updatedRegistration;
  }

  async deleteRegistration(id: number): Promise<boolean> {
    const [deletedRegistration] = await db.delete(registrations).where(eq(registrations.id, id)).returning();
    return !!deletedRegistration;
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    // Get notifications specifically for this user or broadcast notifications (userId is null)
    return await db
      .select()
      .from(notifications)
      .where(
        sql`${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL`
      )
      .orderBy(desc(notifications.createdAt));
  }

  async getBroadcastNotifications(): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(isNull(notifications.userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    // Count unread notifications for this user or broadcast notifications
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        sql`(${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL) AND ${notifications.isRead} = false`
      );
    return result[0]?.count || 0;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationAsRead(id: number, userId: number): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          sql`${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL`
        )
      )
      .returning();
    return notification;
  }

  async hasUserReadNotification(userId: number, notificationId: number): Promise<boolean> {
    const notification = await this.getNotification(notificationId);
    if (!notification) return false;
    return notification.isRead;
  }

  async getUserReadNotifications(userId: number): Promise<number[]> {
    const readNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          sql`${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL`,
          eq(notifications.isRead, true)
        )
      );
    return readNotifications.map(n => n.id);
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        sql`${notifications.userId} = ${userId} OR ${notifications.userId} IS NULL`
      );
  }

  async deleteNotification(id: number): Promise<boolean> {
    const [deletedNotification] = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return !!deletedNotification;
  }

  async deleteAllUserNotifications(userId: number): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.userId, userId))
      .returning();
    return result.length;
  }

  async cleanupOldNotifications(olderThan: Date): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(sql`${notifications.createdAt} < ${olderThan}`)
      .returning();
    return result.length;
  }
}

// Export an instance of the storage
export const neonStorage = new NeonDBStorage();