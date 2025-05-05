import { pgTable, text, serial, integer, boolean, timestamp, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  phoneVerified: boolean("phone_verified").notNull().default(true),
  phoneVerificationBypassed: boolean("phone_verification_bypassed").notNull().default(false),
  gameId: text("game_id").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team model
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").default(''),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  gameType: text("game_type").notNull().default("BGMI"), // BGMI, COD, FREEFIRE
  inviteCode: text("invite_code").notNull().unique(), // 6-digit unique code for team invites
  createdAt: timestamp("created_at").defaultNow(),
});

// Team member model
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  username: text("username").notNull(),
  gameId: text("game_id").notNull(),
  role: text("role").notNull().default("member"), // captain, member, substitute
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament model
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  mapType: text("map_type").notNull(), // Erangel, Miramar, Sanhok, Vikendi
  gameMode: text("game_mode").notNull().default("Squad"), // Solo, Duo, Squad
  teamType: text("team_type").notNull(), // Solo, Duo, Squad (legacy field - use gameMode instead)
  gameType: text("game_type").notNull().default("BGMI"), // BGMI, COD, FREEFIRE
  isPaid: boolean("is_paid").notNull(),
  entryFee: integer("entry_fee").default(0),
  prizePool: integer("prize_pool").default(0),
  totalSlots: integer("total_slots").notNull(),
  slots: integer("slots").notNull().default(100), // Alias for totalSlots for compatibility
  roomId: text("room_id"),
  password: text("password"),
  status: text("status").notNull().default("upcoming"), // upcoming, live, completed
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament registration model
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  slot: integer("slot"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  registeredAt: timestamp("registered_at").defaultNow(),
});

// Notifications model
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null means broadcast to all users
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"), // general, tournament, system
  relatedId: integer("related_id"), // could be tournament ID, etc.
  isRead: boolean("is_read").notNull().default(false), // Only used for user-specific notifications
  createdAt: timestamp("created_at").defaultNow(),
});

// Track which users have read which broadcast notifications
export const notificationReads = pgTable("notification_reads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  notificationId: integer("notification_id").notNull().references(() => notifications.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // Ensure each user can only mark a notification as read once
    // (but allow updating the timestamp if needed)
    userNotificationUnique: uniqueIndex("user_notification_unique").on(
      table.userId, 
      table.notificationId
    ),
  };
});

// Dedicated Admins table for administrator management
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  displayName: text("display_name").notNull(),
  accessLevel: text("access_level").notNull().default("standard"), // standard, super, owner
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  inviteCode: true // We'll generate this automatically
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  roomId: true,
  password: true
}).extend({
  date: z.coerce.date()
});

export const updateTournamentSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  mapType: z.string().optional(),
  gameMode: z.string().optional(),
  gameType: z.string().optional(),
  teamType: z.string().optional(),
  isPaid: z.boolean().optional(),
  entryFee: z.number().optional(),
  prizePool: z.number().optional(),
  totalSlots: z.number().optional(),
  slots: z.number().optional(),
  roomId: z.string().optional(),
  password: z.string().optional(),
  status: z.string().optional(),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  registeredAt: true,
  slot: true,
  status: true,
  paymentStatus: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  isActive: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type UpdateTournament = z.infer<typeof updateTournamentSchema>;

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type NotificationRead = typeof notificationReads.$inferSelect;
export type InsertNotificationRead = {
  userId: number;
  notificationId: number;
};

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
