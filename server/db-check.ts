/**
 * Database diagnostic tool
 * This script checks the database connection and schema
 * It can be used to diagnose production database issues
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';
import { Request, Response } from 'express';
import * as schema from '../shared/schema';

// Configure neon for WebSocket
neonConfig.webSocketConstructor = ws;

/**
 * Get database diagnostic information including:
 * - Connection status
 * - List of existing tables
 * - Table schemas
 * - Record counts
 */
export async function getDatabaseDiagnostics(req: Request, res: Response) {
  try {
    // Check if database URL is available
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'Database URL not set',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }

    // Create pool and client
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    try {
      // Check connection
      await pool.query('SELECT NOW()');
      
      // Get existing tables
      const { rows: tables } = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const existingTables = tables.map(row => row.table_name);
      
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
      
      // Get missing tables
      const missingTables = expectedTables.filter(
        table => !existingTables.includes(table)
      );

      // Get table schemas and record counts
      const tableSchemas = await Promise.all(
        existingTables.map(async (table) => {
          // Get columns for this table
          const { rows: columns } = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position
          `, [table]);
          
          // Get record count
          const { rows: countResult } = await pool.query(`
            SELECT COUNT(*) as count FROM "${table}"
          `);
          
          return {
            name: table,
            columns,
            recordCount: parseInt(countResult[0].count)
          };
        })
      );

      // Return diagnostic info
      return res.json({
        existingTables,
        missingTables,
        tableSchemas,
        env: process.env.NODE_ENV
      });
    } catch (error) {
      console.error('Database diagnostic error:', error);
      return res.status(500).json({
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : String(error),
        env: process.env.NODE_ENV
      });
    } finally {
      // Close pool
      await pool.end();
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