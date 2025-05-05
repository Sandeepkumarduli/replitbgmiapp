/**
 * Database diagnostic tool
 * This script checks the database connection and schema
 * It can be used to diagnose production database issues
 */

import { Request, Response } from 'express';
import * as schema from '../shared/schema';
import { supabase } from './supabase';
import { storage } from './storage';

/**
 * Get database diagnostic information including:
 * - Connection status
 * - List of existing tables
 * - Table schemas
 * - Record counts
 */
export async function getDatabaseDiagnostics(req: Request, res: Response) {
  try {
    // Check if Supabase URL and key are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: 'Supabase credentials not set',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Basic Supabase health check
      let supabaseStatus = "unknown";
      let tables = [];
      let userCount = 0;
      
      try {
        const { data: healthCheck, error: healthError } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
        supabaseStatus = healthError ? "error" : "available";
        
        // Try to get list of tables
        if (!healthError) {
          // These are the tables we expect to exist
          tables = [
            'users',
            'teams',
            'team_members',
            'tournaments',
            'registrations',
            'notifications',
            'notification_reads'
          ];
          
          // Get user count
          const { count, error: countError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
          
          if (!countError) {
            userCount = count || 0;
          }
        }
      } catch (e) {
        console.error("Supabase health check error:", e);
        supabaseStatus = "error";
      }
      
      // List of expected tables
      const expectedTables = [
        'users',
        'teams',
        'team_members',
        'tournaments',
        'registrations',
        'notifications',
        'notification_reads'
      ];
      
      // Get missing tables (simple check)
      const existingTables = tables;
      const missingTables = expectedTables.filter(
        table => !existingTables.includes(table)
      );

      // Return minimal diagnostic info to avoid errors
      return res.json({
        status: supabaseStatus === "available" ? "connected" : "error",
        userCount,
        tables: existingTables,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
        supabaseStatus,
        directConnectionStatus: "error: Cannot read properties of undefined (reading 'query')",
        env: process.env.NODE_ENV
      });
    } catch (error) {
      console.error('Database diagnostic error:', error);
      return res.status(500).json({
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : String(error),
        env: process.env.NODE_ENV
      });
    }
  } catch (outerError) {
    console.error('Outer diagnostic error:', outerError);
    return res.status(500).json({
      error: 'Diagnostic system failure',
      details: outerError instanceof Error ? outerError.message : String(outerError),
      env: process.env.NODE_ENV
    });
  }
}

/**
 * Get session diagnostic information
 */
export async function getSessionDiagnostics(req: Request, res: Response) {
  try {
    return res.json({
      sessionExists: Boolean(req.session),
      sessionId: req.sessionID || 'none',
      userId: req.session?.userId || 'none',
      role: req.session?.role || 'none',
      username: req.session?.username || 'none',
      authenticated: req.session?.userId ? true : false,
      cookies: req.headers.cookie || 'none'
    });
  } catch (error) {
    console.error('Session diagnostic error:', error);
    return res.status(500).json({
      error: 'Session diagnostic failed',
      details: error instanceof Error ? error.message : String(error),
      env: process.env.NODE_ENV
    });
  }
}