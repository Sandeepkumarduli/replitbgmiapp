/**
 * Supabase Database Connection
 * This file sets up the Supabase client for database operations
 * ONLY Supabase is used for all data persistence as per requirements
 */

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fetch from 'node-fetch';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERROR: Missing Supabase credentials in environment variables");
}

// Simple Supabase client without extra options to avoid type conflicts
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log success on server startup
try {
  console.log("Server supabaseUrl:", supabaseUrl.substring(0, 10) + "...");
  console.log("Server supabaseAnonKey:", supabaseAnonKey.substring(0, 10) + "...");
  console.log("Supabase client initialized successfully.");
} catch (e) {
  console.error("Error logging Supabase configuration:", e);
}

// Database access interface for executing SQL
export const db = {
  query: async (sql: string, params?: any[]) => {
    try {
      // Use Supabase for all database operations
      const { data, error } = await supabase.rpc('execute_sql', { 
        query: sql,
        params: params || []
      });
      
      if (error) {
        console.error("Supabase SQL execution error:", error);
        throw error;
      }
      
      return {
        rows: data || [],
        rowCount: data?.length || 0
      };
    } catch (e) {
      console.error("Error executing SQL:", e);
      throw e;
    }
  }
};
