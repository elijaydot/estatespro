import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearMfaSession } from '@/hooks/useMfa';

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

  const logMfaClient = (step: string, details?: Record<string, unknown>) => {
    console.info('[MFA][Client]', step, details ?? {});
  };

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
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession) {
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

      const [{ data: aalData }, factors] = await Promise.all([
        mfaApi.getAuthenticatorAssuranceLevel(),
        listMfaFactors(),
      ]);

      const verifiedFactors = factors.filter((factor) => factor.status === 'verified');
      const isEnabled = verifiedFactors.length > 0;
      const currentLevel = (aalData?.currentLevel as string | null) || null;
      const nextLevel = (aalData?.nextLevel as string | null) || null;
      const needsChallenge = isEnabled && currentLevel !== 'aal2' && nextLevel === 'aal2';

      logMfaClient('refresh-state', {
        isEnabled,
        needsChallenge,
        currentLevel,
        nextLevel,
        factorCount: factors.length,
        verifiedCount: verifiedFactors.length,
      });

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
  }, [listMfaFactors]);

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

        // Keep MFA status aligned with auth transitions (login/logout/token refresh)
        // without blocking route rendering.
        setTimeout(() => {
          void refreshMfaState();
        }, 0);
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
  }, [fetchProfile, refreshMfaState]);

  useEffect(() => {
    refreshMfaState();
  }, [refreshMfaState, session]);

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
    clearMfaSession();
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

      const factorsBefore = await listMfaFactors();
      logMfaClient('enroll-start-factor-list', {
        friendlyName,
        factorsBefore: factorsBefore.map((factor) => ({
          id: factor.id,
          status: factor.status,
          factorType: factor.factor_type,
          friendlyName: factor.friendly_name,
        })),
      });

      const verifiedFactors = factorsBefore.filter((factor) => factor.status === 'verified');
      if (verifiedFactors.length > 0) {
        const currentLevel = mfaState.currentLevel ?? 'aal1';
        const guidance = currentLevel === 'aal2'
          ? 'MFA is already enabled. Use your authenticator code at login, or disable MFA first before creating a new factor.'
          : 'MFA is already enabled. Complete MFA challenge first, then continue using your existing factor.';
        return { data: null, error: new Error(guidance) };
      }

      // Clean up only leftover unverified factors so retries do not fail.
      try {
        const existing = await listMfaFactors();
        for (const f of existing) {
          if (f?.id && f.status !== 'verified') {
            logMfaClient('enroll-cleanup-unenroll-attempt', {
              factorId: f.id,
              status: f.status,
              factorType: f.factor_type,
              friendlyName: f.friendly_name,
            });
            await mfaApi.unenroll({ factorId: f.id });
            logMfaClient('enroll-cleanup-unenroll-success', { factorId: f.id });
          }
        }
      } catch (cleanupErr) {
        console.warn('MFA cleanup before enroll failed:', cleanupErr);
      }

      let { data, error } = await mfaApi.enroll({
        factorType: 'totp',
        friendlyName,
      });

      // Fallback: if Supabase still reports the name as taken, retry with a unique suffix.
      if (error && /already exists/i.test(error.message || '')) {
        const uniqueName = `${friendlyName} (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`;
        ({ data, error } = await mfaApi.enroll({
          factorType: 'totp',
          friendlyName: uniqueName,
        }));
      }

      if (error) {
        if ((error.message || '').toLowerCase().includes('aal2 required')) {
          return {
            data: null,
            error: new Error('MFA is already enrolled on this account. Please complete the MFA code challenge to continue.'),
          };
        }
        return { data: null, error };
      }

      const enrollment: MfaEnrollmentData = {
        factorId: data.id,
        qrCode: data.totp?.qr_code || '',
        secret: data.totp?.secret || '',
        uri: data.totp?.uri || null,
      };

      logMfaClient('enroll-created-response', {
        factorId: enrollment.factorId,
        hasQrCode: Boolean(enrollment.qrCode),
        hasSecret: Boolean(enrollment.secret),
        hasUri: Boolean(enrollment.uri),
      });

      await refreshMfaState();
      return { data: enrollment, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }, [listMfaFactors, mfaState.currentLevel, refreshMfaState]);

  const verifyMfaEnrollment = useCallback(async (factorId: string, code: string) => {
    try {
      const mfaApi = getMfaApi();
      if (!mfaApi) {
        throw new Error('MFA is not supported in this environment.');
      }

      logMfaClient('enroll-verify-start', { factorId });

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
      const factorsAfter = await listMfaFactors();
      logMfaClient('enroll-verify-final-response', {
        factorId,
        verifiedCount: factorsAfter.filter((factor) => factor.status === 'verified').length,
        factorsAfter: factorsAfter.map((factor) => ({
          id: factor.id,
          status: factor.status,
          factorType: factor.factor_type,
        })),
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [listMfaFactors, refreshMfaState]);

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

      logMfaClient('disable-start-factor-list', {
        totalFactors: factors.length,
        verifiedFactors: verifiedFactors.map((factor) => ({
          id: factor.id,
          status: factor.status,
          factorType: factor.factor_type,
          friendlyName: factor.friendly_name,
        })),
      });

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
        logMfaClient('disable-unenroll-attempt', {
          factorId: factor.id,
          status: factor.status,
          factorType: factor.factor_type,
        });
        const { error } = await mfaApi.unenroll({ factorId: factor.id });
        if (error) {
          logMfaClient('disable-unenroll-failed', {
            factorId: factor.id,
            message: error.message,
          });
          return { error };
        }
        logMfaClient('disable-unenroll-success', { factorId: factor.id });
      }

      await refreshMfaState();
      const factorsAfter = await listMfaFactors();
      logMfaClient('disable-final-factor-list', {
        totalFactors: factorsAfter.length,
        verifiedCount: factorsAfter.filter((factor) => factor.status === 'verified').length,
      });
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
