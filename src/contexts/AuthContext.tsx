import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { showSuccess, showError } from '@/utils/toast';

interface CustomUser extends User {
  user_metadata: {
    role?: 'buyer' | 'seller';
    [key: string]: any;
  };
}

interface AuthContextType {
  session: Session | null;
  user: CustomUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ user: CustomUser | null; error: Error | null }>;
  signUpWithEmail: (email: string, password: string, role: 'buyer' | 'seller') => Promise<{ user: CustomUser | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user as CustomUser || null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user as CustomUser || null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError(error.message);
      return { user: null, error };
    }
    showSuccess("Logged in successfully!");
    return { user: data.user as CustomUser, error: null };
  };

  const signUpWithEmail = async (email: string, password: string, role: 'buyer' | 'seller') => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          role: role,
        },
      },
    });
    if (error) {
      showError(error.message);
      return { user: null, error };
    }
    showSuccess("Signed up successfully! Please check your email to confirm your account.");
    return { user: data.user as CustomUser, error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(error.message);
      return { error };
    }
    showSuccess("Logged out successfully!");
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};