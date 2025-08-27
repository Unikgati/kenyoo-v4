import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Use a ref to track the current user ID to avoid stale closures and prevent duplicate fetches
  const currentUserIdRef = useRef<string | null>(null);

  const getAppUserFromSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
      console.log("getAppUserFromSupabaseUser: processing user", supabaseUser.email);
      const baseUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          role: supabaseUser.user_metadata?.role || 'driver',
          username: supabaseUser.email || '',
      };

      if (baseUser.role === 'driver') {
          // =================================================================================
          // FIX for RLS Timeout:
          // The original code queried the 'drivers' table to get the user's name.
          // This was causing timeouts due to a misconfigured Row Level Security (RLS)
          // policy on the 'drivers' table in Supabase.
          //
          // To resolve the timeout error, we are now relying on the 'name' stored
          // in the user's metadata, which is set when the driver account is created.
          // This avoids the problematic database query during login.
          //
          // NOTE: The correct long-term solution is to fix the RLS policy in Supabase.
          // The policy should be: `auth.uid() = "userId"` on the `drivers` table for
          // SELECT operations, and the "userId" column should be indexed.
          // =================================================================================
          console.log(`getAppUserFromSupabaseUser: using metadata name for driver ${supabaseUser.id}`);
          return {
              ...baseUser,
              name: supabaseUser.user_metadata?.name || supabaseUser.email || 'Driver',
          };
      }

      // For admin or other roles
      console.log("getAppUserFromSupabaseUser: processing admin user.");
      return {
          ...baseUser,
          name: supabaseUser.user_metadata?.name || supabaseUser.email || 'Admin User',
      };
  };
  
  useEffect(() => {
    console.log("AuthProvider: Subscribing to auth state changes.");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`AuthProvider: onAuthStateChange event fired: ${_event}`);

      // If the user ID is the same, it's a token refresh. Update the session but don't re-fetch the user profile.
      // This is the primary guard against re-fetching on token refresh events.
      if (session?.user && session.user.id === currentUserIdRef.current) {
        console.log("AuthProvider: Session refreshed for the same user. Skipping profile fetch.");
        setSession(session);
        return;
      }
      
      // A new user is logging in, or the user is logging out. Set loading to true.
      setLoading(true);
      setSession(session);
      
      try {
        if (session?.user) {
            console.log("AuthProvider: New user or session change. Fetching profile for", session.user.email);
            // Set the ref *before* the await call. This is the key to preventing the race condition
            // where two initial auth events fire before the first profile fetch completes.
            currentUserIdRef.current = session.user.id; 
            const appUser = await getAppUserFromSupabaseUser(session.user);
            setUser(appUser);
        } else {
            console.log("AuthProvider: No session, user set to null.");
            setUser(null);
            currentUserIdRef.current = null; // Clear the user ID on logout
        }
      } catch(e) {
          console.error("AuthProvider: Error processing auth state change.", e);
          setUser(null);
          currentUserIdRef.current = null;
      } finally {
        console.log("AuthProvider: Auth state processed. Setting loading to false.");
        setLoading(false);
      }
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from auth state changes.");
      subscription?.unsubscribe();
    };
  }, []); // Run only once on mount

  const login = async (email: string, password?: string) => {
    setError(null);
    setLoading(true); // Set loading true on login attempt
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password || '',
    });
    if (error) {
      setError(error);
      setLoading(false); // Set loading false if login fails
    }
    // On success, onAuthStateChange will handle setting the user and setting loading to false
  };

  const logout = async () => {
    try {
      setLoading(true); // Set loading true on logout
      // Clear all local storage data
      localStorage.clear(); // This will clear driverShiftStatus and any other cached data
      
      // Clear the current user data immediately
      setUser(null);
      setSession(null);
      currentUserIdRef.current = null;

      // Force clear the Supabase session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always set loading to false, regardless of success or failure
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
