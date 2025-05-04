import { createClient } from '@supabase/supabase-js';

// Use VITE_ prefixed env vars for Vite-based projects
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a dummy client for development
const dummyClient = {
  auth: {
    signInWithOtp: async () => ({ error: { message: 'Development mode - OTP functionality disabled' } }),
    verifyOtp: async () => ({ data: { user: null }, error: { message: 'Development mode - OTP functionality disabled' } }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({ error: null }),
    }),
  }),
};

// Export the appropriate client
let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check environment variables.');
  
  if (import.meta.env.DEV) {
    console.warn('Using dummy Supabase client for development');
    supabase = dummyClient;
  } else {
    throw new Error('Missing Supabase credentials');
  }
} else {
  // Real Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };