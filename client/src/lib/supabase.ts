import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables to store Supabase credentials
// Using hardcoded values for reliability - from the newer Supabase instance
let supabaseUrl: string | undefined = 'https://fiouuhhbascmlbrncqcp.supabase.co';
let supabaseAnonKey: string | undefined = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb3V1aGhiYXNjbWxicm5jcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwMjg3NDksImV4cCI6MjA2MTYwNDc0OX0.3Y3PlXsP6SjEPSrgR9zYNwhMSHsFBsiFCPoj8NVWzWs';

// Log the state of credentials
console.log('Client supabaseUrl:', supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'Missing');
console.log('Client supabaseAnonKey:', supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : 'Missing');

// Fetch Supabase credentials from the server
async function fetchSupabaseCredentials() {
  try {
    const response = await fetch('/api/config/supabase');
    if (!response.ok) {
      throw new Error(`Failed to fetch Supabase credentials: ${response.status}`);
    }
    
    const credentials = await response.json();
    if (credentials.url && credentials.anonKey) {
      supabaseUrl = credentials.url;
      supabaseAnonKey = credentials.anonKey;
      console.log('Supabase credentials loaded from server');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error fetching Supabase credentials:', error);
    return false;
  }
}

// Try to fetch credentials if they're not already available
if (!supabaseUrl || !supabaseAnonKey) {
  fetchSupabaseCredentials()
    .then(success => {
      if (success) {
        // Reinitialize the Supabase client with the fetched credentials
        initializeSupabaseClient();
      }
    })
    .catch(err => {
      console.error('Failed to load Supabase credentials:', err);
    });
}

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

// Function to initialize the Supabase client with current credentials
function initializeSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Please check environment variables.');
    
    // Use dummy client in development or if credentials are missing in production
    console.warn('Using dummy Supabase client');
    supabase = dummyClient;
    return false;
  } else {
    // Real Supabase client
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      supabase = dummyClient;
      return false;
    }
  }
}

// Initial initialization
initializeSupabaseClient();

export { supabase, initializeSupabaseClient };