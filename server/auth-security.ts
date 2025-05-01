/**
 * Enhanced security features for authentication
 * Includes:
 * - Rate limiting for login attempts
 * - IP tracking for suspicious activity
 * - Secure admin validation
 * - Authentication logging
 */

import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import 'express-session';

// We're using an existing declaration from auth.ts, so we don't need to redeclare here
// The session interface is already declared in auth.ts with these fields

// Load environment variables
dotenv.config();

// Settings
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes
const ADMIN_WHITELIST_IPS = (process.env.ADMIN_WHITELIST_IPS || '127.0.0.1').split(',');

// Define path for security logs
const SECURITY_LOG_PATH = path.join(process.cwd(), 'logs');
const AUTH_LOG_FILE = path.join(SECURITY_LOG_PATH, 'auth.log');

// Ensure logs directory exists
if (!fs.existsSync(SECURITY_LOG_PATH)) {
  fs.mkdirSync(SECURITY_LOG_PATH, { recursive: true });
}

// Track failed login attempts by IP
const loginAttempts: Record<string, { count: number, timestamp: number }> = {};

// Log security events
export function logSecurityEvent(event: string, req: Request, details?: any): void {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const username = req.body?.username || 'unknown';
  
  const logEntry = JSON.stringify({
    timestamp,
    event,
    ip,
    userAgent,
    username,
    details
  }) + '\n';
  
  fs.appendFile(AUTH_LOG_FILE, logEntry, (err) => {
    if (err) {
      console.error('Error writing to security log:', err);
    }
  });
}

/**
 * Rate limiting middleware for login attempts
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Skip rate limiting for whitelisted IPs
  if (ADMIN_WHITELIST_IPS.includes(ip)) {
    next();
    return;
  }
  
  // Check if this IP is currently locked out
  const attempts = loginAttempts[ip];
  if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLockout = Date.now() - attempts.timestamp;
    
    if (timeSinceLockout < LOCKOUT_TIME_MS) {
      // Still locked out
      const remainingTimeMinutes = Math.ceil((LOCKOUT_TIME_MS - timeSinceLockout) / 60000);
      logSecurityEvent('login_attempt_during_lockout', req);
      
      res.status(429).json({
        message: `Too many login attempts. Please try again in ${remainingTimeMinutes} minutes.`
      });
      return;
    } else {
      // Lockout period expired, reset counter
      delete loginAttempts[ip];
    }
  }
  
  next();
}

/**
 * Track failed login attempts
 */
export function trackFailedLogin(req: Request): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Skip tracking for whitelisted IPs
  if (ADMIN_WHITELIST_IPS.includes(ip)) {
    return;
  }
  
  // Initialize or increment counter
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = { count: 1, timestamp: Date.now() };
  } else {
    loginAttempts[ip].count += 1;
    loginAttempts[ip].timestamp = Date.now();
    
    // Log if approaching limit
    if (loginAttempts[ip].count >= MAX_LOGIN_ATTEMPTS - 1) {
      logSecurityEvent('approaching_login_limit', req, { 
        attempts: loginAttempts[ip].count,
        limit: MAX_LOGIN_ATTEMPTS
      });
    }
  }
  
  // If exceeded limit, log lockout
  if (loginAttempts[ip].count >= MAX_LOGIN_ATTEMPTS) {
    logSecurityEvent('account_lockout', req, { 
      lockout_duration_minutes: LOCKOUT_TIME_MS / 60000
    });
  }
}

/**
 * Reset failed login attempts after successful login
 */
export function resetLoginAttempts(req: Request): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (loginAttempts[ip]) {
    delete loginAttempts[ip];
  }
}

/**
 * Enhanced admin validation middleware
 * Checks admin credentials and validates IP against whitelist for extra security
 */
export async function enhancedAdminCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Check if user is authenticated and session exists
  if (!req.session || !req.session.userId) {
    logSecurityEvent('unauthorized_admin_access_attempt', req);
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  
  try {
    // Get the user record
    const user = await storage.getUser(req.session.userId);
    
    // Check if user exists and is an admin
    if (!user || user.role !== "admin") {
      logSecurityEvent('non_admin_accessing_admin_route', req, { 
        userId: req.session.userId,
        userRole: user?.role || 'unknown'
      });
      res.status(403).json({ message: "Not authorized" });
      return;
    }
    
    // Additional IP validation for admin actions
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const isWhitelistedIP = ADMIN_WHITELIST_IPS.includes(ip);
    
    // For extremely sensitive operations, we can enforce IP whitelist
    // This is commented out by default since it might be too restrictive
    // Uncomment to enable strict IP whitelist for admin access
    /*
    if (!isWhitelistedIP) {
      logSecurityEvent('admin_access_from_non_whitelisted_ip', req, { ip });
      res.status(403).json({ message: "Access denied from this location" });
      return;
    }
    */
    
    // If not using a whitelisted IP, log it for awareness
    if (!isWhitelistedIP) {
      logSecurityEvent('admin_access_from_non_whitelisted_ip', req, { ip });
    }
    
    // Log successful admin action
    logSecurityEvent('admin_action', req, { 
      route: req.path,
      method: req.method
    });
    
    next();
  } catch (error) {
    logSecurityEvent('admin_check_error', req, { error: String(error) });
    res.status(500).json({ message: "Internal server error" });
    return;
  }
}

/**
 * Validate the hardcoded admin credentials
 * This provides an additional layer of security beyond normal authentication
 */
export function validateHardcodedAdmin(username: string, password: string): boolean {
  // The hardcoded admin username and password from the environment
  const adminUsername = process.env.ADMIN_USERNAME || 'Sandeepkumarduli';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Sandy@1234';
  
  return username === adminUsername && password === adminPassword;
}

/**
 * Setup security middleware for routes
 */
export function setupSecurityMiddleware(app: any): void {
  // Apply rate limiting middleware to login route
  app.use('/api/auth/login', loginRateLimiter);
  
  // Log all authentication attempts
  app.use('/api/auth/*', (req: Request, _res: Response, next: NextFunction) => {
    logSecurityEvent('auth_attempt', req);
    next();
  });
}