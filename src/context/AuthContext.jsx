import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { can } from '../lib/rbac';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (error || !data) { supabase.auth.signOut(); setProfile(null); }
        else setProfile(data);
        setLoading(false);
      });
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    window.location.hash = '';
  };

  const refreshProfile = async () => {
    if (!session) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setProfile(data);
  };

  const ability = (permission) => can(profile?.role, permission);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile, ability, role: profile?.role }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
