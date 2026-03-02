import { getSupabaseClient } from './supabaseClient';

export interface MFAFactor {
  id: string;
  type: 'totp';
  friendlyName?: string;
  status: 'verified' | 'unverified';
  createdAt: string;
  updatedAt: string;
}

export interface MFAEnrollResult {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface MFAChallenge {
  id: string;
  factorId: string;
  expiresAt: number;
}

export const getMFAFactors = async (): Promise<MFAFactor[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp || []).map((f) => ({
    id: f.id,
    type: 'totp' as const,
    friendlyName: f.friendly_name,
    status: f.status as 'verified' | 'unverified',
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }));
};

export const getVerifiedMFAFactor = async (): Promise<MFAFactor | null> => {
  const factors = await getMFAFactors();
  return factors.find((f) => f.status === 'verified') || null;
};

export const isMFAEnabled = async (): Promise<boolean> => {
  const factor = await getVerifiedMFAFactor();
  return factor !== null;
};

export const enrollMFA = async (friendlyName?: string): Promise<MFAEnrollResult> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName || 'Authenticator App',
  });
  if (error) throw error;
  if (!data) throw new Error('Failed to enroll MFA');

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
};

export const verifyMFAEnrollment = async (factorId: string, code: string): Promise<boolean> => {
  const supabase = getSupabaseClient();

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;
  if (!challengeData) throw new Error('Failed to create MFA challenge');

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  if (verifyError) throw verifyError;

  return true;
};

export const createMFAChallenge = async (factorId: string): Promise<MFAChallenge> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  if (!data) throw new Error('Failed to create MFA challenge');

  return {
    id: data.id,
    factorId: factorId,
    expiresAt: data.expires_at,
  };
};

export const verifyMFACode = async (factorId: string, challengeId: string, code: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;
  return true;
};

export const unenrollMFA = async (factorId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
};

export const getAuthenticatorAssuranceLevel = async (): Promise<{
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
}> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return {
    currentLevel: data?.currentLevel || null,
    nextLevel: data?.nextLevel || null,
  };
};

export const requiresMFAVerification = async (): Promise<{ required: boolean; factorId?: string }> => {
  const { currentLevel, nextLevel } = await getAuthenticatorAssuranceLevel();
  if (currentLevel === 'aal1' && nextLevel === 'aal2') {
    const factor = await getVerifiedMFAFactor();
    if (factor) {
      return { required: true, factorId: factor.id };
    }
  }
  return { required: false };
};
