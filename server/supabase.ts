import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if URLs are valid
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Using memory storage instead.');
}

// Instead of failing with invalid URLs, use a try-catch and fallback
let supabase: any = null;
try {
  // Only create client if we have valid URLs
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully.');
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  process.env.USE_SUPABASE = 'false'; // Force using memory storage
}

export { supabase };