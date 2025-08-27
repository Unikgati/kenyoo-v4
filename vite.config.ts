import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    console.log('Loaded environment variables:', {
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ? 'Present' : 'Missing',
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
    });
    return {
      define: {
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
