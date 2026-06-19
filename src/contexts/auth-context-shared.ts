import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
}

export type MfaFactor = {
  id: string;
  factor_type?: string;
  status?: string;
  friendly_name?: string;
};

export type MfaEnrollmentData = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string | null;
};

export type MfaState = {
  isSupported: boolean;
  isLoading: boolean;
  isEnabled: boolean;
  needsChallenge: boolean;
  currentLevel: string | null;
  nextLevel: string | null;
  factors: MfaFactor[];
};

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
