import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// =================================================================================
// IMPORTANT: CONFIGURE YOUR SUPABASE CREDENTIALS
// =================================================================================
// You can find these in your Supabase project dashboard under Settings > API.
//
// 1. Replace 'https://YOUR_PROJECT_ID.supabase.co' with your Supabase Project URL.
// 2. Replace 'YOUR_SUPABASE_ANON_KEY' with your Supabase "anon" public key.
//
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log presence (do NOT log full anon key in production)
console.log('lib/supabaseClient: VITE_SUPABASE_URL present?', Boolean(supabaseUrl));
console.log('lib/supabaseClient: VITE_SUPABASE_ANON_KEY present?', Boolean(supabaseAnonKey));
// Optionally show a short masked version for quick local debugging
if (supabaseAnonKey) {
  try {
    const masked = `${supabaseAnonKey.slice(0, 8)}...${supabaseAnonKey.slice(-8)}`;
    console.log('lib/supabaseClient: VITE_SUPABASE_ANON_KEY (masked):', masked);
  } catch (e) {
    // ignore
  }
}
// =================================================================================

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `Supabase credentials are not configured. \n  \nPlease make sure you have set up the following environment variables in your .env file:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY`;
  
  // Display a user-friendly error on the page
  const root = document.getElementById('root');
  if (root) {
      root.innerHTML = `
        <div style="padding: 2rem; text-align: center; font-family: sans-serif; background-color: #fff2f2; color: #b91c1c; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; box-sizing: border-box;">
          <h1 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Configuration Error</h1>
          <pre style="margin-top: 1rem; padding: 1.5rem; background-color: #fee2e2; border-radius: 0.5rem; white-space: pre-wrap; word-wrap: break-word; text-align: left; font-family: monospace; line-height: 1.5;">${errorMessage}</pre>
          <p style="margin-top: 2rem; font-size: 0.9rem;">You can find these details in your Supabase project dashboard under <strong style="font-weight: bold;">Settings > API</strong>.</p>
        </div>
      `;
  }

  // Also throw an error to stop script execution
  throw new Error(errorMessage);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);