import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Server supabaseUrl:', supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'Missing');
console.log('Server supabaseAnonKey:', supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : 'Missing');

// Check if URLs are valid
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Using memory storage instead.');
}

// Instead of failing with invalid URLs, use a try-catch and fallback
let supabase: any = null;
try {
  // Only create client if we have valid URLs
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Don't persist auth state in browser storage
        autoRefreshToken: true // Automatically refresh tokens
      },
      // Set more detailed logging for debugging
      db: {
        schema: 'public'
      },
      global: {
        // Enable debug logging if in development mode
        fetch: (...args) => {
          const [url, options] = args;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Supabase fetch: ${url}`);
          }
          return fetch(...args);
        }
      }
    });
    
    // Test connection
    supabase.from('users').select('count(*)', { count: 'exact', head: true })
      .then(({ count, error }: any) => {
        if (error) {
          console.error('Supabase connection test failed:', error.message);
        } else {
          console.log('Supabase connection successful, user count:', count);
        }
      });
      
    console.log('Supabase client initialized successfully.');
  } else {
    console.error('Cannot initialize Supabase client: Missing credentials');
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  process.env.USE_SUPABASE = 'false'; // Force using memory storage
}

export { supabase };