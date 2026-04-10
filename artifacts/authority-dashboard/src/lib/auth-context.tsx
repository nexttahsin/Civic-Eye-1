import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from './supabase';
import { useGetAuthorityMe, getGetAuthorityMeQueryKey } from '@workspace/api-client-react';
import type { AuthorityUser } from '@workspace/api-client-react';

interface AuthContextType {
  user: AuthorityUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: meData, isLoading: meLoading } = useGetAuthorityMe({
    query: {
      enabled: !!session,
      queryKey: getGetAuthorityMeQueryKey(),
    },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    setLocation('/login');
  };

  const loading = sessionLoading || (!!session && meLoading);
  const user = meData?.authorityUser ?? null;

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
