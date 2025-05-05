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

// For compatibility with existing code
export const db = {
  query: async (sql: string, params?: any[]) => {
    const { data, error } = await supabase.rpc('execute_sql', { 
      query: sql,
      params: params || []
    });
    
    if (error) throw error;
    return data;
  },
  // Add any other database methods that might be needed
};
