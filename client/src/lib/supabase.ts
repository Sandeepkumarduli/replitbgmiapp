// This is a stub replacement for the Supabase client
// We've migrated from Supabase to direct Neon DB usage on the backend

// Interface for our mock client to maintain compatibility with existing code
interface MockClient {
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

console.log('Using Neon DB backend - Supabase client is just a stub');

// Create a dummy client that just logs operations
const dummyClient: MockClient = {
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
  from: (table) => {
    console.log(`Stub Supabase: Attempted to access table: ${table}`);
    return {
      select: (columns) => {
        console.log(`Stub Supabase: Attempted to select columns: ${columns}`);
        return {
          eq: (column, value) => {
            console.log(`Stub Supabase: Attempted to filter ${column} = ${value}`);
            return {
              single: () => Promise.resolve({ data: null, error: null }),
            };
          },
        };
      },
      update: (data) => {
        console.log(`Stub Supabase: Attempted to update with data:`, data);
        return {
          eq: (column, value) => {
            console.log(`Stub Supabase: Attempted to filter for update ${column} = ${value}`);
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  },
};

// Export the dummy client as supabase
export const supabase = dummyClient;
export function initializeSupabaseClient() {
  console.log('Supabase client initialization requested, but we are using Neon DB backend');
  return false;
}