import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Card } from '@/components/ui';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { getSupabaseClient } from '@/services/supabaseClient';
import {
  getOrganizationBySlug,
  getOrganizationsByAccount,
  getOrganizationsForUser,
  getOrgMemberships,
  getUserByEmail,
  upsertOrgMembership,
  setCurrentAccountId,
  setCurrentUserId,
} from '@/services/storage';
import { requiresMFAVerification } from '@/services/mfaService';
import TwoFactorVerify from '@/components/TwoFactorVerify';
import { UserRole } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowRight, Building2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [mfaRequired, setMfaRequired] = useState<{ factorId: string; pendingEmail: string } | null>(null);

  const translationStrings = useMemo(() => ([
    'Welcome back',
    'Create your account',
    'Forgot password',
    'Reset your password',
    'Enter your email to receive a password reset link.',
    'Send reset link',
    'Back to sign in',
    'Sign in to continue managing your workspace.',
    'Set up login credentials to secure your workspace.',
    'Sign in',
    'Create account',
    'Update password',
    'Choose a new secure password for your account.',
    'New Password',
    'Confirm New Password',
    'Passwords do not match',
    'Password updated successfully. Please sign in.',
    'Cancel and sign in',
    'Email address',
    'Or continue with',
    'Sign in with Google',
    'Password',
    'Workspace slug (optional)',
    'Use a workspace slug to jump straight into a dashboard.',
    'No workspace found for this email.',
    'Create workspace',
    'Back to Home',
    'Authentication failed. Please try again.',
    'Check your inbox to confirm your email.',
    'Already have an account?',
    'Need an account?',
    'Secure access',
    'Invite your team',
    'Track revenue in one place',
    'Supabase-backed authentication',
    'Continue',
    'Show password',
    'Hide password',
    'Workspace slug is required',
    'Workspace not found for that slug.',
    'You do not have access to that workspace.',
    'Finish setup',
    'Two-Factor Authentication',
    'Enter the 6-digit code from your authenticator app',
    'Verification Code',
    'Verify',
    'Cancel',
    'Verification failed',
    'Invalid code. Please try again.',
  ]), []);
  const { t } = useTranslation(translationStrings);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get('slug');
    const emailParam = params.get('email');
    const modeParam = params.get('mode');
    
    if (slugParam) setSlug(slugParam);
    if (emailParam) setEmail(emailParam);
    if (modeParam === 'reset') setMode('reset');

    // Check if we arrived from a recovery link (Supabase puts this in the fragment)
    if (window.location.hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, []);

  const resetState = () => {
    setMessage(null);
  };

  const completeLoginAfterMFA = async (userEmail: string) => {
    setLoading(true);
    try {
      fetch('/api/email/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: userEmail, type: 'login_alert' }),
      }).catch(console.error);

      const userRecord = await getUserByEmail(userEmail);
      if (!userRecord) {
        navigate({ to: '/onboarding', search: { email: userEmail } as any });
        return;
      }

      setCurrentUserId(userRecord.id);
      setCurrentAccountId(userRecord.accountId);

      let destinationSlug = slug.trim();
      if (destinationSlug) {
        const org = await getOrganizationBySlug(destinationSlug);
        if (!org) {
          setMessage({ type: 'error', text: t('Workspace not found for that slug.') });
          return;
        }
        const memberships = await getOrgMemberships(org.id);
        const hasAccess = memberships.some((membership) => membership.userId === userRecord.id);
        if (!hasAccess) {
          const isAccountOwner = org.accountId
            && userRecord.accountId === org.accountId
            && [UserRole.OWNER, UserRole.ADMIN].includes(userRecord.role);
          if (!isAccountOwner) {
            setMessage({ type: 'error', text: t('You do not have access to that workspace.') });
            return;
          }

          try {
            await upsertOrgMembership({
              organizationId: org.id,
              userId: userRecord.id,
              role: userRecord.role,
              permissions: userRecord.permissions?.length ? userRecord.permissions : ['ALL'],
            });
          } catch (error) {
            console.error('Failed to restore org membership', error);
            setMessage({ type: 'error', text: t('You do not have access to that workspace.') });
            return;
          }
        }
      } else {
        const orgs = await getOrganizationsForUser(userRecord.id, userRecord.accountId);
        if (!orgs.length && [UserRole.OWNER, UserRole.ADMIN].includes(userRecord.role)) {
          const accountOrgs = await getOrganizationsByAccount(userRecord.accountId);
          if (accountOrgs.length) {
            destinationSlug = accountOrgs[0].slug;
          }
        } else if (orgs.length) {
          destinationSlug = orgs[0].slug;
        }

        if (!destinationSlug) {
          navigate({ to: '/onboarding', search: { email: userEmail } as any });
          return;
        }
      }

      navigate({ to: '/org/$slug', params: { slug: destinationSlug } });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    resetState();
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: t('Authentication failed. Please try again.') });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const normalizedEmail = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
        return;
      }

      const mfaCheck = await requiresMFAVerification();
      if (mfaCheck.required && mfaCheck.factorId) {
        setMfaRequired({ factorId: mfaCheck.factorId, pendingEmail: normalizedEmail });
        setLoading(false);
        return;
      }

      // Notify backend about login
      fetch('/api/email/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: normalizedEmail, type: 'login_alert' }),
      }).catch(console.error);

      const userRecord = await getUserByEmail(normalizedEmail);
      if (!userRecord) {
        navigate({ to: '/onboarding', search: { email: normalizedEmail } as any });
        return;
      }

      setCurrentUserId(userRecord.id);
      setCurrentAccountId(userRecord.accountId);

      let destinationSlug = slug.trim();
      if (destinationSlug) {
        const org = await getOrganizationBySlug(destinationSlug);
        if (!org) {
          setMessage({ type: 'error', text: t('Workspace not found for that slug.') });
          return;
        }
        const memberships = await getOrgMemberships(org.id);
        const hasAccess = memberships.some((membership) => membership.userId === userRecord.id);
        if (!hasAccess) {
          const isAccountOwner = org.accountId
            && userRecord.accountId === org.accountId
            && [UserRole.OWNER, UserRole.ADMIN].includes(userRecord.role);
          if (!isAccountOwner) {
            setMessage({ type: 'error', text: t('You do not have access to that workspace.') });
            return;
          }

          try {
            await upsertOrgMembership({
              organizationId: org.id,
              userId: userRecord.id,
              role: userRecord.role,
              permissions: userRecord.permissions?.length ? userRecord.permissions : ['ALL'],
            });
          } catch (error) {
            console.error('Failed to restore org membership', error);
            setMessage({ type: 'error', text: t('You do not have access to that workspace.') });
            return;
          }
        }
      } else {
        const orgs = await getOrganizationsForUser(userRecord.id, userRecord.accountId);
        if (!orgs.length && [UserRole.OWNER, UserRole.ADMIN].includes(userRecord.role)) {
          const accountOrgs = await getOrganizationsByAccount(userRecord.accountId);
          if (accountOrgs.length) {
            destinationSlug = accountOrgs[0].slug;
          }
        } else if (orgs.length) {
          destinationSlug = orgs[0].slug;
        }

        if (!destinationSlug) {
          navigate({ to: '/onboarding', search: { email: normalizedEmail } as any });
          return;
        }
      }

      navigate({ to: '/org/$slug', params: { slug: destinationSlug } });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    resetState();
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: t('Authentication failed. Please try again.') });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const normalizedEmail = email.trim();
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
        return;
      }

      // Notify backend about signup
      fetch('/api/email/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: normalizedEmail, type: 'welcome' }),
      }).catch(console.error);

      setMessage({ type: 'success', text: t('Check your inbox to confirm your email.') });
      navigate({ to: '/onboarding', search: { email: normalizedEmail } as any });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    resetState();
    if (!email.trim()) {
      setMessage({ type: 'error', text: t('Email address is required') });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#/login?mode=reset`,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }

      setMessage({ type: 'success', text: t('Check your inbox to confirm your email.') });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    resetState();
    if (!password || password !== confirmPassword) {
      setMessage({ type: 'error', text: t('Passwords do not match') });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }

      setMessage({ type: 'success', text: t('Password updated successfully. Please sign in.') });
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    resetState();
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) {
        setMessage({ type: 'error', text: error.message || t('Authentication failed. Please try again.') });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || t('Authentication failed. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      handleSignIn();
    } else if (mode === 'signup') {
      handleSignUp();
    } else if (mode === 'forgot') {
      handleForgotPassword();
    } else {
      handleResetPassword();
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {mfaRequired && (
        <TwoFactorVerify
          factorId={mfaRequired.factorId}
          onSuccess={() => {
            const pendingEmail = mfaRequired.pendingEmail;
            setMfaRequired(null);
            completeLoginAfterMFA(pendingEmail);
          }}
          onCancel={() => {
            setMfaRequired(null);
            getSupabaseClient().auth.signOut();
          }}
          translations={{
            title: t('Two-Factor Authentication'),
            description: t('Enter the 6-digit code from your authenticator app'),
            verificationCode: t('Verification Code'),
            verify: t('Verify'),
            cancel: t('Cancel'),
            error: t('Verification failed'),
            invalidCode: t('Invalid code. Please try again.'),
          }}
        />
      )}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -top-32 right-[-10%] w-[420px] h-[420px] bg-primary/20 blur-[140px]" />
      <div className="absolute bottom-0 left-[-5%] w-[360px] h-[360px] bg-foreground/10 blur-[140px]" />

      <header className="relative z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate({ to: '/' })}>
            <img src="/logo.svg" alt="ZuriBills" className="w-9 h-9" />
            <span className="font-display text-lg font-semibold tracking-tight">
              <span className="text-foreground">Zuri</span><span className="text-primary">Bills</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            <button
              onClick={() => navigate({ to: '/' })}
              className="text-sm font-medium text-muted hover:text-foreground transition-colors hidden sm:inline"
            >
              {t('Back to Home')}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col lg:flex-row items-center gap-12 px-4 py-12">
        <div className="hidden lg:flex w-1/2">
          <Card className="p-10 w-full bg-surface border-border shadow-soft">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted">
                <ShieldCheck className="w-4 h-4 text-primary" /> {t('Secure access')}
              </div>
              <h2 className="text-3xl font-display font-semibold text-foreground">{t('Sign in to continue managing your workspace.')}</h2>
              <p className="text-sm text-muted">
                {t('Supabase-backed authentication')}
              </p>

              <div className="grid gap-4">
                {[t('Invite your team'), t('Track revenue in one place')].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="w-full lg:w-1/2">
          <Card className="p-8 bg-background border-border shadow-soft">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-display font-semibold text-foreground">
                      {mode === 'signin' ? t('Welcome back') : mode === 'signup' ? t('Create your account') : mode === 'forgot' ? t('Forgot password') : t('Update password')}
                    </h1>
                    <p className="text-sm text-muted mt-2">
                      {mode === 'signin'
                        ? t('Sign in to continue managing your workspace.')
                        : mode === 'signup'
                          ? t('Set up login credentials to secure your workspace.')
                          : mode === 'forgot'
                            ? t('Enter your email to receive a password reset link.')
                            : t('Choose a new secure password for your account.')}
                    </p>
                  </div>

              </div>

              {message && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode !== 'reset' && (
                  <Input
                    label={t('Email address')}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
                
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Input
                      label={mode === 'reset' ? t('New Password') : t('Password')}
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-[38px] text-muted hover:text-foreground transition-colors"
                      aria-label={showPassword ? t('Hide password') : t('Show password')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {mode === 'reset' && (
                  <Input
                    label={t('Confirm New Password')}
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                )}

                {mode === 'signin' && (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-primary hover:underline"
                      >
                        {t('Forgot password')}?
                      </button>
                    </div>
                    <div>
                      <Input
                        label={t('Workspace slug (optional)')}
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                      />
                      <p className="text-xs text-muted mt-2">{t('Use a workspace slug to jump straight into a dashboard.')}</p>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full h-12 text-base" isLoading={loading}>
                  {mode === 'signin' ? t('Sign in') : mode === 'signup' ? t('Create account') : mode === 'forgot' ? t('Send reset link') : t('Update password')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                {(mode === 'signin' || mode === 'signup') && (
                  <div className="space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <span className="relative bg-background px-4 text-xs text-muted uppercase tracking-wider">{t('Or continue with')}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full h-12 rounded-xl border border-border bg-surface hover:bg-surface/80 flex items-center justify-center gap-3 transition-all duration-200 group"
                    >
                      <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="text-sm font-semibold">{t('Sign in with Google')}</span>
                    </button>
                  </div>
                )}
              </form>

              <div className="text-xs text-muted">
                {mode === 'signin' ? (
                  <span>
                    {t('Need an account?')}{' '}
                    <a
                      href="/signup"
                      className="text-foreground underline decoration-primary/60 underline-offset-4"
                    >
                      {t('Create account')}
                    </a>
                  </span>
                ) : mode === 'signup' ? (
                  <span>
                    {t('Already have an account?')}{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signin'); resetState(); }}
                      className="text-foreground underline decoration-primary/60 underline-offset-4"
                    >
                      {t('Sign in')}
                    </button>
                  </span>
                ) : mode === 'forgot' ? (
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); resetState(); }}
                    className="text-foreground underline decoration-primary/60 underline-offset-4"
                  >
                    {t('Back to sign in')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); resetState(); }}
                    className="text-foreground underline decoration-primary/60 underline-offset-4"
                  >
                    {t('Cancel and sign in')}
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
