import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
}

type MfaFactor = {
  id: string;
  factor_type?: string;
  status?: string;
  friendly_name?: string;
};

type MfaEnrollmentData = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string | null;
};

type MfaState = {
  isSupported: boolean;
  isLoading: boolean;
  isEnabled: boolean;
  needsChallenge: boolean;
  currentLevel: string | null;
  nextLevel: string | null;
  factors: MfaFactor[];
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string, role?: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
  mfa: MfaState;
  refreshMfaState: () => Promise<void>;
  enrollMfaTotp: (friendlyName?: string) => Promise<{ data: MfaEnrollmentData | null; error: Error | null }>;
  verifyMfaEnrollment: (factorId: string, code: string) => Promise<{ error: Error | null }>;
  verifyMfaChallenge: (code: string) => Promise<{ error: Error | null }>;
  disableMfa: (password: string, code: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaState, setMfaState] = useState<MfaState>({
    isSupported: true,
    isLoading: true,
    isEnabled: false,
    needsChallenge: false,
    currentLevel: null,
    nextLevel: null,
    factors: [],
  });

  const getMfaApi = () => (supabase.auth as any).mfa;

  const listMfaFactors = useCallback(async (): Promise<MfaFactor[]> => {
    const mfaApi = getMfaApi();
    if (!mfaApi) return [];

    const { data, error } = await mfaApi.listFactors();
    if (error) throw error;

    const rawFactors = [
      ...(data?.totp || []),
      ...(data?.phone || []),
      ...(data?.all || []),
    ] as MfaFactor[];

    const deduped = new Map<string, MfaFactor>();
    rawFactors.forEach((factor) => {
      if (factor?.id) deduped.set(factor.id, factor);
    });

    return Array.from(deduped.values());
  }, []);

  const refreshMfaState = useCallback(async () => {
    if (!session) {
      setMfaState((prev) => ({
        ...prev,
        isLoading: false,
        isEnabled: false,
        needsChallenge: false,
        currentLevel: null,
        nextLevel: null,
        factors: [],
      }));
      return;
    }

    try {
      const mfaApi = getMfaApi();
      if (!mfaApi) {
        setMfaState({
          isSupported: false,
          isLoading: false,
          isEnabled: false,
          needsChallenge: false,
          currentLevel: null,
          nextLevel: null,
          factors: [],
        });
        return;
      }

      setMfaState((prev) => ({ ...prev, isLoading: true }));

      const [{ data: aalData }, factors] = await Promise.all([
        mfaApi.getAuthenticatorAssuranceLevel(),
        listMfaFactors(),
      ]);

      const verifiedFactors = factors.filter((factor) => factor.status === 'verified');
      const isEnabled = verifiedFactors.length > 0;
      const currentLevel = (aalData?.currentLevel as string | null) || null;
      const nextLevel = (aalData?.nextLevel as string | null) || null;
      const needsChallenge = isEnabled && currentLevel !== 'aal2' && nextLevel === 'aal2';

      setMfaState({
        isSupported: true,
        isLoading: false,
        isEnabled,
        needsChallenge,
        currentLevel,
        nextLevel,
        factors,
      });
    } catch (error) {
      console.error('Error refreshing MFA state:', error);
      setMfaState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [listMfaFactors, session]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }

        if (!session) {
          setMfaState((prev) => ({
            ...prev,
            isLoading: false,
            isEnabled: false,
            needsChallenge: false,
            currentLevel: null,
            nextLevel: null,
            factors: [],
          }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    refreshMfaState();
  }, [refreshMfaState]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: string = 'property_manager', metadata: Record<string, string> = {}) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
            ...metadata,
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          await logout();
        }
      } else if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
      }
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  }, [logout]);

  const enrollMfaTotp = useCallback(async (friendlyName: string = 'FishGate Authenticator') => {
    try {
      const mfaApi = getMfaApi();
      if (!mfaApi) {
        throw new Error('MFA is not supported in this environment.');
      }

      const { data, error } = await mfaApi.enroll({
        factorType: 'totp',
        friendlyName,
      });

      if (error) {
        return { data: null, error };
      }

      const enrollment: MfaEnrollmentData = {
        factorId: data.id,
        qrCode: data.totp?.qr_code || '',
        secret: data.totp?.secret || '',
        uri: data.totp?.uri || null,
      };

      await refreshMfaState();
      return { data: enrollment, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }, [refreshMfaState]);

  const verifyMfaEnrollment = useCallback(async (factorId: string, code: string) => {
    try {
      const mfaApi = getMfaApi();
      if (!mfaApi) {
        throw new Error('MFA is not supported in this environment.');
      }

      const { data: challenge, error: challengeError } = await mfaApi.challenge({ factorId });
      if (challengeError) {
        return { error: challengeError };
      }

      const { error } = await mfaApi.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });

      if (error) {
        return { error };
      }

      await refreshMfaState();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [refreshMfaState]);

  const verifyMfaChallenge = useCallback(async (code: string) => {
    try {
      const mfaApi = getMfaApi();
      if (!mfaApi) {
        throw new Error('MFA is not supported in this environment.');
      }

      const factors = await listMfaFactors();
      const verifiedFactor = factors.find((factor) => factor.status === 'verified');

      if (!verifiedFactor?.id) {
        throw new Error('No verified MFA factor found.');
      }

      const { data: challenge, error: challengeError } = await mfaApi.challenge({ factorId: verifiedFactor.id });
      if (challengeError) {
        return { error: challengeError };
      }

      const { error } = await mfaApi.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.id,
        code: code.trim(),
      });

      if (error) {
        return { error };
      }

      await refreshMfaState();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [listMfaFactors, refreshMfaState]);

  const disableMfa = useCallback(async (password: string, code: string) => {
    try {
      const mfaApi = getMfaApi();
      if (!mfaApi) {
        throw new Error('MFA is not supported in this environment.');
      }

      if (!user?.email) {
        throw new Error('Unable to confirm user email for re-authentication.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        return { error: signInError };
      }

      const factors = await listMfaFactors();
      const verifiedFactors = factors.filter((factor) => factor.status === 'verified');

      if (verifiedFactors.length === 0) {
        await refreshMfaState();
        return { error: null };
      }

      const primaryFactor = verifiedFactors[0];
      const { data: challenge, error: challengeError } = await mfaApi.challenge({ factorId: primaryFactor.id });
      if (challengeError) {
        return { error: challengeError };
      }

      const { error: verifyError } = await mfaApi.verify({
        factorId: primaryFactor.id,
        challengeId: challenge.id,
        code: code.trim(),
      });

      if (verifyError) {
        return { error: verifyError };
      }

      for (const factor of verifiedFactors) {
        const { error } = await mfaApi.unenroll({ factorId: factor.id });
        if (error) {
          return { error };
        }
      }

      await refreshMfaState();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [listMfaFactors, refreshMfaState, user?.email]);

  useEffect(() => {
    if (!session) return;

    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing session...');
      refreshSession();
    }, 10 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [session, refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAuthenticated: !!session,
        isLoading,
        login,
        logout,
        signup,
        refreshSession,
        mfa: mfaState,
        refreshMfaState,
        enrollMfaTotp,
        verifyMfaEnrollment,
        verifyMfaChallenge,
        disableMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
