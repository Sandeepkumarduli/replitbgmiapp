import { 
  users, teams, teamMembers, tournaments, registrations, notifications, notificationReads,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration,
  type Notification, type InsertNotification, 
  type NotificationRead, type InsertNotificationRead
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, asc, or, isNull, count, lt } from "drizzle-orm";
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
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error fetching user with id ${id}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error(`Error fetching user with username ${username}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error fetching user with email ${email}:`, error);
      throw error;
    }
  }
  
  async getUserByPhone(phone: string): Promise<User | undefined> {
    try {
      console.log(`Looking for user with phone: ${phone}`);
      
      // Attempt exact match first
      let result = await db.select().from(users).where(eq(users.phone, phone));
      
      if (result && result.length > 0) {
        console.log(`Found user with exact phone match: ${result[0].username}`);
        return result[0];
      }
      
      // Format the phone number to try alternative formats
      let formattedPhone = phone;
      if (phone.startsWith('+91')) {
        // Try without the +91 prefix
        formattedPhone = phone.substring(3);
        console.log(`Trying alternative format without +91: ${formattedPhone}`);
        result = await db.select().from(users).where(eq(users.phone, formattedPhone));
      } else if (!phone.startsWith('+')) {
        // Try with +91 prefix
        formattedPhone = `+91${phone}`;
        console.log(`Trying alternative format with +91: ${formattedPhone}`);
        result = await db.select().from(users).where(eq(users.phone, formattedPhone));
      }
      
      if (result && result.length > 0) {
        console.log(`Found user with alternative phone format: ${result[0].username}`);
        return result[0];
      }
      
      console.log(`No user found with phone ${phone} or any alternative formats`);
      return undefined;
    } catch (error) {
      console.error(`Error fetching user with phone ${phone}:`, error);
      throw error;
    }
  }
  
  // Diagnostic function to check database connectivity and tables
  async checkDatabaseStatus(): Promise<{ status: string, userCount: number, tables: string[] }> {
    try {
      // Test basic query
      const userCount = await db.select({ count: count() }).from(users);
      
      // Get list of all tables
      const tablesList = [
        'users', 'teams', 'team_members', 'tournaments', 
        'registrations', 'notifications', 'notification_reads'
      ];
      
      console.log('Database connection successful');
      console.log(`User count: ${userCount[0].count}`);
      
      return {
        status: 'connected',
        userCount: Number(userCount[0].count),
        tables: tablesList
      };
    } catch (error) {
      console.error('Database connectivity test failed:', error);
      return {
        status: 'error',
        userCount: 0,
        tables: []
      };
    }
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
      
      // First, get all teams owned by this user
      const userTeams = await this.getTeamsByOwnerId(id);
      
      // For each team
      for (const team of userTeams) {
        // 1. Delete all team members
        await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
        
        // 2. Delete all registrations for this team
        await db.delete(registrations).where(eq(registrations.teamId, team.id));
        
        // 3. Delete the team itself
        await db.delete(teams).where(eq(teams.id, team.id));
      }
      
      // Delete any remaining team members where this user is a member of someone else's team
      await db.delete(teamMembers).where(eq(teamMembers.username, user.username));
      
      // Delete all tournament registrations made by this user
      await db.delete(registrations).where(eq(registrations.userId, id));
      
      // Finally, delete the user
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error; // Rethrow to properly handle in controller
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(asc(users.id));
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    try {
      const [team] = await db.select().from(teams).where(eq(teams.id, id));
      return team;
    } catch (error) {
      console.error(`Error fetching team with id ${id}:`, error);
      throw error;
    }
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    try {
      const [team] = await db.select().from(teams).where(eq(teams.name, name));
      return team;
    } catch (error) {
      console.error(`Error fetching team with name ${name}:`, error);
      throw error;
    }
  }
  
  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    try {
      const [team] = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode));
      return team;
    } catch (error) {
      console.error(`Error fetching team with invite code ${inviteCode}:`, error);
      throw error;
    }
  }

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    try {
      return await db.select().from(teams).where(eq(teams.ownerId, ownerId));
    } catch (error) {
      console.error(`Error fetching teams with owner id ${ownerId}:`, error);
      throw error;
    }
  }

  async createTeam(insertTeam: InsertTeam & { inviteCode: string }): Promise<Team> {
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
      
      // First, delete all team members to handle foreign key constraints
      await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
      
      // Then delete any tournament registrations associated with this team
      await db.delete(registrations).where(eq(registrations.teamId, id));
      
      // Now safe to delete the team
      await db.delete(teams).where(eq(teams.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error; // Rethrow to handle in the controller for proper error messages
    }
  }
  
  async getAllTeams(): Promise<Team[]> {
    try {
      return await db.select().from(teams).orderBy(asc(teams.id));
    } catch (error) {
      console.error('Error fetching all teams:', error);
      throw error;
    }
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    try {
      return await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
    } catch (error) {
      console.error(`Error fetching team members for team ${teamId}:`, error);
      throw error;
    }
  }
  
  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    try {
      const [member] = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.id, id));
      return member;
    } catch (error) {
      console.error(`Error fetching team member with id ${id}:`, error);
      throw error;
    }
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
    try {
      const [tournament] = await db.select()
        .from(tournaments)
        .where(eq(tournaments.id, id));
      return tournament;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }

  async getAllTournaments(): Promise<Tournament[]> {
    try {
      return await db.select()
        .from(tournaments)
        .orderBy(asc(tournaments.date));
    } catch (error) {
      console.error('Error fetching all tournaments:', error);
      throw error;
    }
  }

  async getTournamentsByStatus(status: string): Promise<Tournament[]> {
    try {
      return await db.select()
        .from(tournaments)
        .where(eq(tournaments.status, status))
        .orderBy(asc(tournaments.date));
    } catch (error) {
      console.error(`Error fetching tournaments with status ${status}:`, error);
      throw error;
    }
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
      
      // First delete all registrations for this tournament
      await db.delete(registrations).where(eq(registrations.tournamentId, id));
      
      // Now safe to delete the tournament
      await db.delete(tournaments).where(eq(tournaments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error; // Rethrow to handle in the controller
    }
  }

  // Registration operations
  async getRegistration(id: number): Promise<Registration | undefined> {
    try {
      const [registration] = await db.select()
        .from(registrations)
        .where(eq(registrations.id, id));
      return registration;
    } catch (error) {
      console.error('Error fetching registration:', error);
      throw error;
    }
  }

  async getRegistrationsByTournament(tournamentId: number): Promise<Registration[]> {
    try {
      return await db.select()
        .from(registrations)
        .where(eq(registrations.tournamentId, tournamentId));
    } catch (error) {
      console.error(`Error fetching registrations for tournament ${tournamentId}:`, error);
      throw error;
    }
  }

  async getRegistrationsByUser(userId: number): Promise<Registration[]> {
    try {
      return await db.select()
        .from(registrations)
        .where(eq(registrations.userId, userId));
    } catch (error) {
      console.error(`Error fetching registrations for user ${userId}:`, error);
      throw error;
    }
  }

  async getRegistrationsByTeam(teamId: number): Promise<Registration[]> {
    try {
      return await db.select()
        .from(registrations)
        .where(eq(registrations.teamId, teamId));
    } catch (error) {
      console.error(`Error fetching registrations for team ${teamId}:`, error);
      throw error;
    }
  }

  async checkRegistration(tournamentId: number, teamId: number): Promise<boolean> {
    try {
      const [registration] = await db.select({ id: registrations.id })
        .from(registrations)
        .where(and(
          eq(registrations.tournamentId, tournamentId),
          eq(registrations.teamId, teamId)
        ));
      return !!registration;
    } catch (error) {
      console.error(`Error checking registration for tournament ${tournamentId} and team ${teamId}:`, error);
      throw error;
    }
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
    try {
      const [updatedRegistration] = await db.update(registrations)
        .set(registrationUpdate)
        .where(eq(registrations.id, id))
        .returning();
      return updatedRegistration;
    } catch (error) {
      console.error('Error updating registration:', error);
      throw error;
    }
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
      throw error; // Rethrow to handle in the controller
    }
  }

  // Notification operations
  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db.select()
        .from(notifications)
        .where(eq(notifications.id, id));
      return notification;
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      // Get all user-specific and broadcast notifications
      const allNotifications = await db.select()
        .from(notifications)
        .where(
          or(
            eq(notifications.userId, userId),
            isNull(notifications.userId)
          )
        )
        .orderBy(desc(notifications.createdAt));
      
      // Get all notification IDs this user has read
      const readNotificationIds = await this.getUserReadNotifications(userId);
      
      // Mark broadcast notifications as read or unread for this specific user
      return allNotifications.map(notification => {
        // For broadcast notifications, check if this user has read it
        if (notification.userId === null) {
          return {
            ...notification,
            isRead: readNotificationIds.includes(notification.id)
          };
        }
        
        // User-specific notifications keep their original isRead status
        return notification;
      });
    } catch (error) {
      console.error(`Error fetching notifications for user ${userId}:`, error);
      throw error;
    }
  }

  async getBroadcastNotifications(): Promise<Notification[]> {
    try {
      return await db.select()
        .from(notifications)
        .where(isNull(notifications.userId))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Error fetching broadcast notifications:', error);
      throw error;
    }
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    try {
      // First, get all unread user-specific notifications
      const unreadUserNotifications = await db.select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
      
      // Now, get all broadcast notifications
      const broadcastNotifications = await this.getBroadcastNotifications();
      
      // Get IDs of broadcast notifications the user has already read
      const readNotificationIds = await this.getUserReadNotifications(userId);
      
      // Count broadcast notifications that the user hasn't read
      const unreadBroadcastCount = broadcastNotifications.filter(
        notification => !readNotificationIds.includes(notification.id)
      ).length;
      
      // Return the total count of unread notifications
      return (unreadUserNotifications[0]?.count || 0) + unreadBroadcastCount;
    } catch (error) {
      console.error(`Error fetching unread notification count for user ${userId}:`, error);
      throw error;
    }
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    try {
      const [notification] = await db.insert(notifications)
        .values({
          ...insertNotification,
          isRead: false
        })
        .returning();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number, userId: number): Promise<Notification | undefined> {
    try {
      const notification = await this.getNotification(id);
      if (!notification) return undefined;
      
      // For user-specific notifications, update the isRead flag directly
      if (notification.userId === userId) {
        const [updatedNotification] = await db.update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, id))
          .returning();
        
        return updatedNotification;
      } 
      // For broadcast notifications, add an entry to the notification_reads table
      else if (notification.userId === null) {
        // Insert into notification_reads, ignoring conflicts (if already read)
        await db.insert(notificationReads)
          .values({
            userId,
            notificationId: id
          })
          .onConflictDoNothing({
            target: [notificationReads.userId, notificationReads.notificationId]
          });
        
        return notification; // Return the original notification
      }
      
      return notification;
    } catch (error) {
      console.error(`Error marking notification ${id} as read for user ${userId}:`, error);
      throw error;
    }
  }

  async hasUserReadNotification(userId: number, notificationId: number): Promise<boolean> {
    try {
      const notification = await this.getNotification(notificationId);
      if (!notification) return false;
      
      // For user-specific notifications, check the isRead flag
      if (notification.userId === userId) {
        return notification.isRead;
      } 
      // For broadcast notifications, check the notification_reads table
      else if (notification.userId === null) {
        const reads = await db.select()
          .from(notificationReads)
          .where(
            and(
              eq(notificationReads.userId, userId),
              eq(notificationReads.notificationId, notificationId)
            )
          )
          .limit(1);
        
        return reads.length > 0;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if user ${userId} has read notification ${notificationId}:`, error);
      return false;
    }
  }
  
  async getUserReadNotifications(userId: number): Promise<number[]> {
    try {
      const reads = await db.select()
        .from(notificationReads)
        .where(eq(notificationReads.userId, userId));
      
      return reads.map(read => read.notificationId);
    } catch (error) {
      console.error(`Error getting read notifications for user ${userId}:`, error);
      return [];
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      // For user-specific notifications, update the isRead flag
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
      
      // For broadcast notifications, add entries to notification_reads table
      const broadcastNotifications = await this.getBroadcastNotifications();
      
      // Get IDs of broadcast notifications the user has already read
      const readNotificationIds = await this.getUserReadNotifications(userId);
      
      // Filter out notifications that are already read
      const unreadBroadcastNotifications = broadcastNotifications.filter(
        notification => !readNotificationIds.includes(notification.id)
      );
      
      // Insert read records for each unread broadcast notification
      if (unreadBroadcastNotifications.length > 0) {
        for (const notification of unreadBroadcastNotifications) {
          await db.insert(notificationReads)
            .values({
              userId,
              notificationId: notification.id
            })
            .onConflictDoNothing({
              target: [notificationReads.userId, notificationReads.notificationId]
            });
        }
      }
    } catch (error) {
      console.error(`Error marking all notifications as read for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      // Before deletion, check if the notification exists
      const notification = await this.getNotification(id);
      if (!notification) return false;
      
      await db.delete(notifications).where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
  
  async cleanupOldNotifications(olderThan: Date): Promise<number> {
    try {
      // Delete notifications older than the specified date
      const result = await db.delete(notifications)
        .where(lt(notifications.createdAt, olderThan))
        .returning();
      
      return result.length;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0; // Return 0 instead of throwing to prevent disrupting the application
    }
  }
  
  // Delete all notifications for a specific user
  async deleteAllUserNotifications(userId: number): Promise<number> {
    try {
      // First, delete all notification read entries for this user
      try {
        await db.delete(notificationReads)
          .where(eq(notificationReads.userId, userId));
        console.log(`Deleted notification reads for user ${userId}`);
      } catch (readError) {
        console.error('Error deleting notification reads:', readError);
        // Continue with the process even if this fails
      }
      
      // Then delete only user-specific notifications, NOT broadcast notifications
      const result = await db.delete(notifications)
        .where(eq(notifications.userId, userId))
        .returning();
      
      return result.length;
    } catch (error) {
      console.error('Error deleting all user notifications:', error);
      return 0; // Return 0 instead of throwing to prevent disrupting the application
    }
  }
}