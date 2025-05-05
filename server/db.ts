/**
 * Supabase Database Connection
 * This file sets up the Supabase client for database operations
 * ONLY Supabase is used for all data persistence as per requirements
 */

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Get Supabase credentials from environment variables or use the ones provided by user
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fiouuhhbascmlbrncqcp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3V1aGhiYXNjbWxicm5jcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjg3NDksImV4cCI6MjA2MTYwNDc0OX0.3Y3PlXsP6SjEPSrgR9zYNwhMSHsFBsiFCPoj8NVWzWs';

// Create Supabase client
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
