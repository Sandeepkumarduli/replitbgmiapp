import { createClient } from '@supabase/supabase-js';

// Use VITE_ prefixed env vars for Vite-based projects
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a dummy client for development with DEV mode capabilities
const dummyClient = {
  auth: {
    signInWithOtp: async ({ phone }) => {
      console.log(`DEV MODE: Sending mock OTP to ${phone}`);
      // In development, we simulate a success
      if (phone) {
        return { 
          data: { 
            otp: '123456',  // Fixed OTP for development
            phone
          }, 
          error: null 
        };
      }
      return { error: { message: 'Development mode - Phone number required' } };
    },
    
    verifyOtp: async ({ phone, token }) => {
      console.log(`DEV MODE: Verifying mock OTP: ${token} for phone: ${phone}`);
      
      // In development, allow any 6-digit OTP
      if (phone && token && token.length === 6 && /^\d+$/.test(token)) {
        return { 
          data: { 
            user: { 
              id: 'dev-user', 
              phone 
            },
            session: {
              access_token: 'dev-token',
              user: { id: 'dev-user', phone }
            }
          }, 
          error: null 
        };
      }
      
      return { 
        data: { user: null }, 
        error: { message: 'Development mode - Invalid OTP format' } 
      };
    },
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