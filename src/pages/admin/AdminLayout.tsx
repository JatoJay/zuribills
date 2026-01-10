import React, { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { Outlet, useParams, Link, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, FileText, Settings as SettingsIcon, Users, ShoppingBag, LogOut, ShieldCheck, ExternalLink, Wallet, BarChart3, Building2, Sparkles, CheckCircle, Lock, Landmark } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BusinessChatWidget from '@/components/BusinessChatWidget';
import { Button, Card } from '@/components/ui';
import { getSupabaseClient } from '@/services/supabaseClient';
import { clearCurrentAccountId, clearCurrentUserId, getAccountById, getCurrentUserId, getOrganizationBySlug, getUserByEmail, setCurrentAccountId, setCurrentUserId } from '@/services/storage';
import { Account, Organization } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';

interface AdminContextType {
  org: Organization;
  account?: Account;
  isOwner: boolean;
  refreshOrg: () => void;
  formatMoney: (amount: number, currencyCode?: string) => string;
}

const EMPTY_ORG: Organization = {
  id: '',
  accountId: '',
  ownerId: '',
  name: '',
  slug: '',
  primaryColor: '#0EA5A4',
  currency: 'USD',
  contactEmail: '',
  createdAt: '',
};

const EMPTY_ADMIN_CONTEXT: AdminContextType = {
  org: EMPTY_ORG,
  account: undefined,
  isOwner: false,
  refreshOrg: () => {},
  formatMoney: () => '',
};

export const AdminContext = createContext<AdminContextType>(EMPTY_ADMIN_CONTEXT);

export const useAdminContext = () => useContext(AdminContext);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const AdminLayout: React.FC = () => {
  const params = useParams({ strict: false });
  const slug = (params as any).slug;
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [account, setAccount] = useState<Account | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [authReady, setAuthReady] = useState(false);
  const translationStrings = useMemo(() => ([
    'Loading...',
    'Admin Dashboard',
    'Overview',
    'Businesses',
    'Services',
    'Invoices',
    'Expenses',
    'Clients',
    'Reports',
    'Team',
    'Payouts',
    'Settings',
    'Public Catalog',
    'Sign Out',
    'Full access trial',
    'Ends in',
    'day',
    'days',
    'Upgrade now',
    'Trial ended',
    'Upgrade your plan',
    'Upgrade to keep using invoices, payments, and reports.',
    'Lock in uninterrupted access to all InvoiceFlow tools.',
    'Choose your plan',
    'Monthly',
    'Yearly',
    'Billed monthly',
    'Billed yearly',
    'Best value',
    'Unlimited invoices',
    'Public catalog & checkout',
    'Team access',
    'AI insights',
    'Included features',
    'Activate subscription',
    'Upgrade failed. Please try again.',
    'Authentication failed. Please try again.',
    'Close',
  ]), []);
  const { t, setLanguage } = useTranslation(translationStrings);

  const refreshOrg = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let isActive = true;
    let authSubscription: { subscription: { unsubscribe: () => void } } | undefined;

    const clearSession = () => {
      clearCurrentAccountId();
      clearCurrentUserId();
    };

    const navigateToLogin = (targetSlug?: string) => {
      navigate({
        to: '/login',
        search: targetSlug ? ({ slug: targetSlug } as any) : {},
        replace: true,
      });
    };

    const navigateToOnboarding = (email: string) => {
      navigate({
        to: '/onboarding',
        search: { email } as any,
        replace: true,
      });
    };

    const handleSession = async (session: { user?: { email?: string | null } } | null) => {
      const email = session?.user?.email;
      if (!email) {
        if (!isActive) return;
        clearSession();
        setAuthReady(true);
        navigateToLogin(slug);
        return;
      }

      try {
        const userRecord = await getUserByEmail(email);
        if (!isActive) return;
        if (!userRecord) {
          clearSession();
          setAuthReady(true);
          navigateToOnboarding(email);
          return;
        }
        setCurrentUserId(userRecord.id);
        setCurrentAccountId(userRecord.accountId);
        setAuthReady(true);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load authenticated user', error);
        clearSession();
        setAuthReady(true);
        navigateToLogin(slug);
      }
    };

    const init = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        await handleSession(data.session);
        authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
          handleSession(session);
        }).data;
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to initialize auth session', error);
        clearSession();
        setAuthReady(true);
        navigateToLogin(slug);
      }
    };

    init();

    return () => {
      isActive = false;
      authSubscription?.subscription.unsubscribe();
    };
  }, [navigate, slug]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (slug && authReady) {
      getOrganizationBySlug(slug).then(o => {
        if (o) {
          setOrg(o);
          if (o.accountId) {
            setCurrentAccountId(o.accountId);
          }
          if (o.ownerId && !getCurrentUserId()) {
            setCurrentUserId(o.ownerId);
          }
          getAccountById(o.accountId).then(setAccount);
        }
        else navigate({ to: '/' });
      }).catch((error) => {
        console.error('Failed to load organization', error);
        navigate({ to: '/' });
      });
    }
  }, [slug, navigate, refreshTrigger, authReady]);

  useEffect(() => {
    if (!org?.preferredLanguage) return;
    const source = localStorage.getItem(LANGUAGE_SOURCE_KEY);
    if (source === 'user') return;
    localStorage.setItem(LANGUAGE_SOURCE_KEY, 'org');
    setLanguage(org.preferredLanguage);
  }, [org?.preferredLanguage, setLanguage]);

  const formatMoney = (amount: number, currencyCode?: string) => {
    if (!org) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode || org.currency || 'USD'
      }).format(amount).replace(/[\u00A0\u202F]/g, ' ');
    } catch (error) {
      // Fallback if currency code is invalid
      return `${currencyCode || org.currency} ${amount.toFixed(2)} `;
    }
  };

  const openUpgradeModal = () => {
    setUpgradeError(null);
    setShowUpgradeModal(true);
  };

  const closeUpgradeModal = () => {
    setUpgradeError(null);
    setShowUpgradeModal(false);
  };

  const handleUpgrade = async () => {
    if (!org) return;
    setIsUpgrading(true);
    setUpgradeError(null);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error(t('Authentication failed. Please try again.'));
      }

      const response = await fetch('/api/billing/flutterwave/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orgId: org.id,
          billingCycle,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || t('Upgrade failed. Please try again.'));
      }

      const payload = await response.json().catch(() => ({}));
      if (!payload?.link) {
        throw new Error(t('Upgrade failed. Please try again.'));
      }

      setShowUpgradeModal(false);
      window.location.href = payload.link;
    } catch (error: any) {
      setUpgradeError(error?.message || t('Upgrade failed. Please try again.'));
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
    } finally {
      clearCurrentAccountId();
      clearCurrentUserId();
      navigate({ to: '/login', search: slug ? ({ slug } as any) : {} });
    }
  };

  if (!authReady) return <div className="p-8">{t('Loading...')}</div>;
  if (!org) return <div className="p-8">{t('Loading...')}</div>;
  const trialEndTime = org.trial?.endsAt ? new Date(org.trial.endsAt).getTime() : Number.NaN;
  const hasTrial = Number.isFinite(trialEndTime);
  const subscriptionActive = org.subscription?.status === 'active';
  const trialActive = hasTrial && trialEndTime > now;
  const trialExpired = hasTrial && trialEndTime <= now;
  const daysRemaining = trialActive ? Math.ceil((trialEndTime - now) / MS_PER_DAY) : 0;
  const showTrialBanner = hasTrial && trialActive && !subscriptionActive;
  const showTrialGate = hasTrial && trialExpired && !subscriptionActive;
  const isOwner = account?.ownerUserId ? account.ownerUserId === (getCurrentUserId() || org.ownerId) : true;

  const baseNavItemClass = "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors";
  const inactiveClass = "text-muted hover:bg-surface/50 hover:text-foreground";
  const activeClass = "bg-primary/10 text-primary border border-primary/20 shadow-sm";

  const navItems = [
    { label: t('Businesses'), path: 'businesses', icon: Building2 },
    { label: t('Services'), path: 'services', icon: ShoppingBag },
    { label: t('Invoices'), path: 'invoices', icon: FileText },
    { label: t('Expenses'), path: 'expenses', icon: Wallet },
    { label: t('Clients'), path: 'clients', icon: Users },
    { label: t('Reports'), path: 'reports', icon: BarChart3 },
    { label: t('Team'), path: 'team', icon: ShieldCheck },
    { label: t('Payouts'), path: 'payouts', icon: Landmark },
    { label: t('Settings'), path: 'settings', icon: SettingsIcon },
  ];

  const upgradeFeatures = [
    t('Unlimited invoices'),
    t('Public catalog & checkout'),
    t('Team access'),
    t('AI insights'),
  ];

  const billingOptions = [
    { value: 'monthly' as const, label: t('Monthly'), price: '$4.99', detail: t('Billed monthly') },
    { value: 'yearly' as const, label: t('Yearly'), price: '$54', detail: t('Billed yearly'), badge: t('Best value') },
  ];

  const UpgradePanel = ({
    title,
    subtitle,
    icon: Icon,
    showClose,
    onClose,
  }: {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    showClose?: boolean;
    onClose?: () => void;
  }) => (
    <Card className="p-8 border border-border bg-surface">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('Choose your plan')}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {billingOptions.map((option) => {
              const isSelected = billingCycle === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBillingCycle(option.value)}
                  className={`rounded-2xl border p-4 text-left transition-all ${isSelected ? 'border-primary/60 bg-primary/10' : 'border-border hover:border-foreground/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{option.label}</span>
                    {option.badge && (
                      <span className="text-[10px] uppercase font-semibold tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{option.price}</div>
                  <div className="text-xs text-muted mt-1">{option.detail}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('Included features')}</div>
          <ul className="space-y-2">
            {upgradeFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {upgradeError && (
        <div className="mt-4 text-sm text-red-600">{upgradeError}</div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
        {showClose && (
          <Button variant="outline" onClick={onClose}>
            {t('Close')}
          </Button>
        )}
        <Button onClick={handleUpgrade} isLoading={isUpgrading}>
          {t('Activate subscription')}
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-surface/50 backdrop-blur-xl border-r border-border fixed h-full hidden md:flex flex-col z-20">
        <div className="p-6 border-b border-border">
          <h1 className="font-bold text-lg truncate text-foreground flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="text-primary text-xs">IF</span>
            </div>
            {org.name}
          </h1>
          <p className="text-xs text-muted mt-1 px-8">{t('Admin Dashboard')}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">

          <Link
            to="/org/$slug"
            params={{ slug }}
            activeOptions={{ exact: true }}
            className={`${baseNavItemClass} ${inactiveClass}`}
            activeProps={{ className: `${baseNavItemClass} ${activeClass}` }}
          >
            <LayoutDashboard className="w-4 h-4" /> {t('Overview')}
          </Link>

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={`/org/$slug/${item.path}` as any}
              params={{ slug } as any}
              className={`${baseNavItemClass} ${inactiveClass}`}
              activeProps={{ className: `${baseNavItemClass} ${activeClass}` }}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2 bg-surface/30">
          <div className="px-4 py-2">
            <ThemeToggle />
          </div>
          <Link
            to="/catalog/$slug"
            params={{ slug }}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-2 text-sm text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> {t('Public Catalog')}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" /> {t('Sign Out')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8 relative z-10 overflow-auto">
        <AdminContext.Provider value={{ org, account, isOwner, refreshOrg, formatMoney }}>
          <div className="space-y-6">
            {showTrialBanner && (
              <Card className="p-4 border border-primary/30 bg-primary/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {t('Full access trial')}
                      </div>
                      <div className="text-sm text-foreground">
                        {t('Ends in')} {daysRemaining} {daysRemaining === 1 ? t('day') : t('days')}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={openUpgradeModal}>
                    {t('Upgrade now')}
                  </Button>
                </div>
              </Card>
            )}

            {showTrialGate ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-full max-w-3xl">
                  <UpgradePanel
                    title={t('Trial ended')}
                    subtitle={t('Upgrade to keep using invoices, payments, and reports.')}
                    icon={Lock}
                  />
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </AdminContext.Provider>
      </main>

      <BusinessChatWidget org={org} />

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-3xl">
            <UpgradePanel
              title={t('Upgrade your plan')}
              subtitle={t('Lock in uninterrupted access to all InvoiceFlow tools.')}
              icon={Sparkles}
              showClose
              onClose={closeUpgradeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
