/**
 * Supabase Database Connection
 * This file sets up the Supabase client for database operations
 * ONLY Supabase is used for all data persistence as per requirements
 */

import { createClient } from '@supabase/supabase-js';
import * as schema from "@shared/schema";

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Did you forget to provision Supabase?"
  );
}

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

// This interface simulates the old Neon DB interface to help with transition
// Will be removed once all code is fully migrated to use Supabase directly
export const db = {
  query: async (sql: string, params?: any[]) => {
    try {
      // Use direct SQL execution through Supabase (requires appropriate permissions)
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
      console.error("Error executing SQL via Supabase:", e);
      throw e;
    }
  }
};
