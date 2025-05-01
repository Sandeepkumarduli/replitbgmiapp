import { 
  users, teams, teamMembers, tournaments, registrations,
  type User, type InsertUser, 
  type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember,
  type Tournament, type InsertTournament, type UpdateTournament,
  type Registration, type InsertRegistration
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  getTeamsByOwnerId(ownerId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Team member operations
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private tournaments: Map<number, Tournament>;
  private registrations: Map<number, Registration>;
  
  private userId: number;
  private teamId: number;
  private teamMemberId: number;
  private tournamentId: number;
  private registrationId: number;

  constructor() {
    this.users = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.tournaments = new Map();
    this.registrations = new Map();
    
    this.userId = 1;
    this.teamId = 1;
    this.teamMemberId = 1;
    this.tournamentId = 1;
    this.registrationId = 1;
    
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
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
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

  async getTeamsByOwnerId(ownerId: number): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(
      (team) => team.ownerId === ownerId,
    );
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
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

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.teamId === teamId,
    );
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.teamMemberId++;
    const createdAt = new Date();
    const member: TeamMember = { ...insertMember, id, createdAt };
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
    const tournament: Tournament = { ...insertTournament, id, createdAt };
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
}

export const storage = new MemStorage();
