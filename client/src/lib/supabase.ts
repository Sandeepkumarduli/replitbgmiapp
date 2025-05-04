import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use NEXT_PUBLIC_ prefixed env vars for consistency
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Client supabaseUrl:', supabaseUrl ? 'Available' : 'Missing');
console.log('Client supabaseAnonKey:', supabaseAnonKey ? 'Available' : 'Missing');

// Interface for our mock Supabase client
interface MockSupabaseClient {
  auth: {
    signInWithOtp: (params: { phone: string }) => Promise<{
      data: any;
      error: any;
    }>;
    verifyOtp: (params: { phone: string; token: string }) => Promise<{
      data: any;
      error: any;
    }>;
  };
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: any) => {
        single: () => Promise<{ data: any; error: any }>;
      };
    };
    update: (data: any) => {
      eq: (column: string, value: any) => Promise<{ error: any }>;
    };
  };
}

// Create a dummy client for development with DEV mode capabilities
const dummyClient: MockSupabaseClient = {
  auth: {
    signInWithOtp: async ({ phone }: { phone: string }) => {
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
      return { data: null, error: { message: 'Development mode - Phone number required' } };
    },
    
    verifyOtp: async ({ phone, token }: { phone: string, token: string }) => {
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
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
  }),
};

// Export the appropriate client
let supabase: SupabaseClient | MockSupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check environment variables.');
  
  // Use dummy client in development or if credentials are missing in production
  console.warn('Using dummy Supabase client');
  supabase = dummyClient;
} else {
  // Real Supabase client
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    supabase = dummyClient;
  }
}

export { supabase };