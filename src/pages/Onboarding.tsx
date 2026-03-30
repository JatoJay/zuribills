import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Select } from '../components/ui';
import { createAccount, createOrganization, ensureAuthUser, getAccountById, getOrganizationBySlug, getOrganizationsForUser, getUserByEmail, setCurrentAccountId, setCurrentUserId } from '../services/storage';
import { UserRole } from '../types';
import { ShieldCheck, Clock3, Sparkles, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePrompt } from '@/context/PromptContext';
import { resolveDefaultCurrency, resolvePayoutProvider } from '@/services/paymentRouting';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';
import { getSupabaseClient } from '@/services/supabaseClient';
import { PRICING_PLANS, calculateTrialEndDate, getPricingPlan } from '@/constants/pricing';

type CountryOption = {
    code: string;
    name: string;
    currencyCode: string;
    currencyName: string;
};

const fallbackCountries: CountryOption[] = [
    { code: 'NG', name: 'Nigeria', currencyCode: 'NGN', currencyName: 'Nigerian Naira' },
    { code: 'GH', name: 'Ghana', currencyCode: 'GHS', currencyName: 'Ghanaian Cedi' },
    { code: 'KE', name: 'Kenya', currencyCode: 'KES', currencyName: 'Kenyan Shilling' },
    { code: 'RW', name: 'Rwanda', currencyCode: 'RWF', currencyName: 'Rwandan Franc' },
    { code: 'ZA', name: 'South Africa', currencyCode: 'ZAR', currencyName: 'South African Rand' },
    { code: 'EG', name: 'Egypt', currencyCode: 'EGP', currencyName: 'Egyptian Pound' },
    { code: 'US', name: 'United States', currencyCode: 'USD', currencyName: 'US Dollar' },
    { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', currencyName: 'British Pound' },
    { code: 'CA', name: 'Canada', currencyCode: 'CAD', currencyName: 'Canadian Dollar' },
    { code: 'FR', name: 'France', currencyCode: 'EUR', currencyName: 'Euro' },
    { code: 'DE', name: 'Germany', currencyCode: 'EUR', currencyName: 'Euro' },
    { code: 'IN', name: 'India', currencyCode: 'INR', currencyName: 'Indian Rupee' },
    { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', currencyName: 'UAE Dirham' },
    { code: 'AU', name: 'Australia', currencyCode: 'AUD', currencyName: 'Australian Dollar' },
];

const baseSlides = [
    {
        image: '/illustration_scale.svg',
        title: 'Scale Your Business',
        description: 'Track revenue, manage clients, and grow with data-driven insights.'
    },
    {
        image: '/illustration_payments.svg',
        title: 'Get Paid Faster',
        description: 'Create professional invoices in seconds and let AI handle the reminders.'
    },
    {
        image: '/illustration_compliance.svg',
        title: 'Bank-Grade Compliance',
        description: 'Stay audit-ready with our AI-powered compliance and security tools.'
    }
];

const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const prompt = usePrompt();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const selectedPlanId = searchParams.get('plan') || 'yearly';
    const selectedPlan = getPricingPlan(selectedPlanId) || PRICING_PLANS.yearly;

    const [loading, setLoading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [googleProfile, setGoogleProfile] = useState<{ name: string; email: string; picture?: string } | null>(null);
    const [oauthError, setOauthError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        contactEmail: '',
    });
    const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
    const [countriesLoading, setCountriesLoading] = useState(true);
    const [countryCode, setCountryCode] = useState('');
    const [currencyInfo, setCurrencyInfo] = useState({
        code: 'USD',
        name: 'US Dollar',
    });

    const generateUniqueSlug = async (name: string) => {
        const base = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'business';
        const existing = await getOrganizationBySlug(base);
        if (!existing) return base;
        let count = 2;
        let candidate = `${base}-${count}`;
        while (await getOrganizationBySlug(candidate)) {
            count += 1;
            candidate = `${base}-${count}`;
        }
        return candidate;
    };

    const deriveOwnerName = (email: string) => {
        const [namePart] = email.split('@');
        if (!namePart) return 'Business Owner';
        return namePart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % baseSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const translationKeys = useMemo(() => ([
        'Set up your organization',
        'Enter your business details to get started with ZuriBills.',
        'Business Name',
        'Contact Email',
        'Country',
        'Preferred Language',
        'Currency',
        'Continue with Google',
        'Or continue with email',
        'Signed in as',
        'Use a different account',
        'Google sign-in failed. Please try again.',
        'Please sign in to continue.',
        'Create & Launch Dashboard',
        'Back to Home',
        'Select your country',
        'Popular languages in Nigeria: Hausa, Yoruba, Igbo, Nigerian Pidgin.',
        'We will set your currency automatically.',
        'Please select a country.',
        'Please enter your business name and contact email.',
        'Please sign in with Google above to continue',
        'Loading countries...',
        'Slug might already exist or invalid data.',
        'Translating...',
        'By signing up, you agree to our Terms of Service and Privacy Policy.',
        '10-min setup',
        'Secure by default',
        'AI-assisted',
        'Selected Plan',
        'Monthly Plan',
        'Yearly Plan',
        '/mo',
        '3-day free trial',
        'You can cancel anytime during the trial period.',
        'Change plan',
        ...baseSlides.flatMap(slide => [slide.title, slide.description]),
    ]), []);
    const { t, language, setLanguage, isTranslating } = useTranslation(translationKeys);
    const slides = useMemo(() => (
        baseSlides.map(slide => ({
            ...slide,
            title: t(slide.title),
            description: t(slide.description),
        }))
    ), [t]);

    const countryOptions = useMemo(() => {
        if (countriesLoading) {
            return [{ label: t('Loading countries...'), value: '' }];
        }
        return [
            { label: t('Select your country'), value: '' },
            ...countries.map(country => ({ label: country.name, value: country.code })),
        ];
    }, [countries, countriesLoading, t]);

    useEffect(() => {
        const selected = countries.find((country) => country.code === countryCode);
        if (selected) {
            const resolvedCode = resolveDefaultCurrency(selected.code, selected.currencyCode);
            const fallbackName = resolvedCode === selected.currencyCode ? selected.currencyName : 'US Dollar';
            const currencyNames: Record<string, string> = {
                USD: 'US Dollar',
                NGN: 'Nigerian Naira',
                GHS: 'Ghanaian Cedi',
                KES: 'Kenyan Shilling',
                ZAR: 'South African Rand',
                RWF: 'Rwandan Franc',
                CAD: 'Canadian Dollar',
            };
            setCurrencyInfo({
                code: resolvedCode,
                name: currencyNames[resolvedCode] || fallbackName,
            });
        }
    }, [countryCode, countries]);

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const metadata = user.user_metadata || {};
                const email = user.email || '';
                const name = metadata.full_name || metadata.name || deriveOwnerName(email);
                const picture = metadata.avatar_url || metadata.picture || '';

                const existingUser = await getUserByEmail(email);
                if (existingUser) {
                    const orgs = await getOrganizationsForUser(existingUser.id, existingUser.accountId);
                    if (orgs.length > 0) {
                        setCurrentUserId(existingUser.id);
                        setCurrentAccountId(existingUser.accountId);
                        navigate({ to: `/org/${orgs[0].slug}` });
                        return;
                    }
                }

                setGoogleProfile({
                    name,
                    email,
                    picture: picture || undefined,
                });
                setFormData(prev => ({
                    ...prev,
                    contactEmail: prev.contactEmail || email,
                }));
            }
        };

        checkAuth();

        const params = new URLSearchParams(window.location.search);
        const sso = params.get('sso');
        const email = params.get('email') || '';
        const error = params.get('oauthError');

        if (error) {
            setOauthError(error);
        }

        if (!sso && email) {
            setFormData(prev => ({
                ...prev,
                contactEmail: prev.contactEmail || email,
            }));
        }

        if (sso || error) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    useEffect(() => {
        let isActive = true;
        const loadCountries = async () => {
            setCountriesLoading(true);
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,currencies');
                if (!response.ok) throw new Error('Failed to fetch countries');
                const data = await response.json();
                const parsed: CountryOption[] = data
                    .map((country: any) => {
                        const currencyEntries = country.currencies ? Object.entries(country.currencies) : [];
                        const currencyCode = currencyEntries[0]?.[0];
                        const currencyData = currencyEntries[0]?.[1] as { name?: string } | undefined;
                        return {
                            code: country.cca2,
                            name: country.name?.common,
                            currencyCode: currencyCode || 'USD',
                            currencyName: currencyData?.name || 'US Dollar',
                        };
                    })
                    .filter((country: CountryOption) => country.code && country.name)
                    .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));

                if (isActive) {
                    setCountries(parsed);
                }
            } catch (error) {
                console.error('Failed to load countries, using fallback list.', error);
                if (isActive) {
                    setCountries(fallbackCountries);
                }
            } finally {
                if (isActive) {
                    setCountriesLoading(false);
                }
            }
        };

        loadCountries();
        return () => {
            isActive = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const authUser = authData?.user;
        const authEmail = authUser?.email?.trim().toLowerCase() || '';

        if (authError || !authUser || !authEmail) {
            prompt.alert(t('Please sign in to continue.'));
            navigate({ to: '/login', search: formData.contactEmail ? ({ email: formData.contactEmail.trim() } as any) : {} as any });
            return;
        }

        if (!formData.name.trim() || !(formData.contactEmail.trim() || authEmail)) {
            prompt.alert(t('Please enter your business name and contact email.'));
            return;
        }
        const selectedCountry = countries.find((country) => country.code === countryCode);
        if (!selectedCountry) {
            prompt.alert(t('Please select a country.'));
            return;
        }
        setLoading(true);
        try {
            const ownerName = googleProfile?.name || deriveOwnerName(authEmail);
            const accountId = authUser.id;
            const ownerId = authUser.id;
            const contactEmail = formData.contactEmail.trim() || authEmail;

            await ensureAuthUser({
                id: ownerId,
                accountId,
                name: ownerName,
                email: authEmail,
                role: UserRole.OWNER,
                permissions: ['ALL'],
                avatarUrl: googleProfile?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=random`,
            });

            const existingAccount = await getAccountById(accountId);
            if (!existingAccount) {
                await createAccount({
                    id: accountId,
                    name: ownerName,
                    ownerUserId: ownerId,
                    contactEmail: authEmail,
                });
            }

            setCurrentAccountId(accountId);
            setCurrentUserId(ownerId);

            const slug = await generateUniqueSlug(formData.name);
            const resolvedCurrency = resolveDefaultCurrency(selectedCountry.code, selectedCountry.currencyCode);
            const payoutProvider = resolvePayoutProvider(selectedCountry.code);
            // Calculate trial dates
            const trialStartDate = new Date();
            const trialEndDate = calculateTrialEndDate(trialStartDate);

            await createOrganization({
                accountId: accountId!,
                ownerId: ownerId!,
                name: formData.name.trim(),
                slug,
                contactEmail,
                currency: resolvedCurrency,
                primaryColor: '#0EA5A4',
                catalogEnabled: true,
                preferredLanguage: language.trim() || 'English',
                paymentConfig: {
                    enabled: false,
                    provider: payoutProvider,
                    platformFeePercent: 0.7,
                    bankCountry: selectedCountry.code,
                },
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zip: '',
                    country: selectedCountry.name,
                },
                // Trial period info
                trial: {
                    startsAt: trialStartDate.toISOString(),
                    endsAt: trialEndDate.toISOString(),
                    accessLevel: 'full',
                },
                // Subscription info (will be activated after trial)
                subscription: {
                    status: 'active', // Active during trial
                    billingCycle: selectedPlan.billingCycle,
                    startedAt: trialStartDate.toISOString(),
                },
            });
            navigate({ to: `/org/${slug}` });
        } catch (err: any) {
            console.error('Organization creation failed:', err);
            const errorMessage = err?.message || t('Slug might already exist or invalid data.');
            prompt.alert({ message: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        const redirect = encodeURIComponent('/onboarding');
        window.location.href = `/api/auth/google/start?redirect=${redirect}`;
    };

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const showGoogleButton = Boolean(googleClientId);

    return (
        <div
            className="relative min-h-screen bg-white text-black"
            style={{
                '--background': '#ffffff',
                '--surface': '#ffffff',
                '--text': '#0b0b0b',
                '--text-muted': '#64748b',
                '--border': '#cbd5e1',
            } as React.CSSProperties}
        >
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute -top-24 right-0 w-[420px] h-[420px] bg-primary/15 blur-[140px]" />
            <div className="absolute bottom-0 left-0 w-[320px] h-[320px] bg-primary/10 blur-[140px]" />

            <header className="relative z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="ZuriBills" className="w-10 h-10" />
                        <span className="font-display text-lg font-semibold tracking-tight text-black">
                            Zuri<span className="text-primary">Bills</span>
                        </span>
                    </div>
                    <button
                        onClick={() => navigate({ to: '/' })}
                        className="text-sm font-medium text-slate-600 hover:text-black transition-colors"
                    >
                        {t('Back to Home')}
                    </button>
                </div>
            </header>

            <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
                <div className="hidden lg:flex w-1/2 items-center justify-center px-12 py-16">
                    <div className="w-full max-w-xl">
                        <div className="rounded-3xl border border-slate-200 bg-white shadow-soft p-10">
                            <div className="relative aspect-square">
                                {slides.map((slide, index) => (
                                    <img
                                        key={slide.title}
                                        src={slide.image}
                                        alt={slide.title}
                                        className={`absolute inset-0 h-full w-full object-contain transition-all duration-700 ${index === currentSlide ? 'opacity-100 translate-x-0' : index < currentSlide ? 'opacity-0 -translate-x-6' : 'opacity-0 translate-x-6'
                                            }`}
                                        loading="lazy"
                                    />
                                ))}
                            </div>

                            <div className="mt-10 text-center space-y-3">
                                <h2 className="text-2xl font-display font-semibold text-black">
                                    {slides[currentSlide].title}
                                </h2>
                                <p className="text-slate-500 text-base">
                                    {slides[currentSlide].description}
                                </p>

                                <div className="flex justify-center gap-2 mt-6">
                                    {slides.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentSlide(idx)}
                                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-primary w-8' : 'bg-slate-200 w-2 hover:bg-slate-300'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-3 gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <Clock3 className="w-4 h-4 text-primary" /> {t('10-min setup')}
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" /> {t('Secure by default')}
                            </div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" /> {t('AI-assisted')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12 lg:px-12">
                    <div className="max-w-md w-full">
                        <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-200">
                            <div className="mt-6">
                                <h1 className="text-3xl font-display font-semibold text-black">{t('Set up your organization')}</h1>
                                <p className="mt-2 text-slate-600">{t('Enter your business details to get started with ZuriBills.')}</p>
                            </div>

                            {showGoogleButton && (
                                <div className="mt-6 space-y-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-12 text-base border-slate-300 text-slate-800 hover:bg-slate-50"
                                        onClick={handleGoogleLogin}
                                    >
                                        <span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-700">
                                            G
                                        </span>
                                        {t('Continue with Google')}
                                    </Button>

                                    {googleProfile && (
                                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {googleProfile.picture ? (
                                                    <img
                                                        src={googleProfile.picture}
                                                        alt={googleProfile.name}
                                                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold">
                                                        {googleProfile.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-xs uppercase tracking-wide text-slate-500">{t('Signed in as')}</div>
                                                    <div className="text-sm font-semibold text-slate-900">{googleProfile.name}</div>
                                                    <div className="text-xs text-slate-500">{googleProfile.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleGoogleLogin}
                                                className="text-xs font-semibold text-primary hover:text-primary/80"
                                            >
                                                {t('Use a different account')}
                                            </button>
                                        </div>
                                    )}

                                    {oauthError && (
                                        <div className="text-xs text-red-600">{t('Google sign-in failed. Please try again.')}</div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span className="text-xs uppercase tracking-wide text-slate-400">{t('Or continue with email')}</span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6 mt-8">
                                <Input
                                    label={t('Business Name')}
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />

                                <Input
                                    label={t('Contact Email')}
                                    type="email"
                                    required
                                    value={formData.contactEmail}
                                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                />

                                <Select
                                    label={t('Country')}
                                    options={countryOptions}
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    disabled={countriesLoading}
                                />

                                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3">
                                    <div className="text-xs uppercase tracking-wider text-slate-500">{t('Currency')}</div>
                                    <div className="text-sm font-semibold text-black mt-1">
                                        {currencyInfo.code} • {currencyInfo.name}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{t('We will set your currency automatically.')}</p>
                                </div>

                                {/* Selected Plan Display */}
                                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-xs uppercase tracking-wider text-primary font-semibold">{t('Selected Plan')}</div>
                                        <button
                                            type="button"
                                            onClick={() => navigate({ to: '/', hash: 'pricing' })}
                                            className="text-xs text-primary hover:text-primary/80 font-medium"
                                        >
                                            {t('Change plan')}
                                        </button>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-display font-semibold text-black">
                                            {t(selectedPlan.name)}
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            ${selectedPlan.pricePerMonth}{t('/mo')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                        <span className="text-sm text-slate-600">{t('3-day free trial')}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        {t('You can cancel anytime during the trial period.')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {t('Preferred Language')}
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => {
                                            localStorage.setItem(LANGUAGE_SOURCE_KEY, 'user');
                                            setLanguage(e.target.value);
                                        }}
                                        className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                                    >
                                        {SUPPORTED_LANGUAGES.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                    {countryCode === 'NG' && (
                                        <p className="text-xs text-slate-500 mt-2">{t('Popular languages in Nigeria: Hausa, Yoruba, Igbo, Nigerian Pidgin.')}</p>
                                    )}
                                    {isTranslating && (
                                        <p className="text-xs text-slate-500 mt-2">{t('Translating...')}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base"
                                    isLoading={loading}
                                    disabled={!googleProfile && showGoogleButton}
                                >
                                    {t('Create & Launch Dashboard')}
                                </Button>

                                {!googleProfile && showGoogleButton && (
                                    <p className="text-xs text-center text-amber-600 mt-2">
                                        {t('Please sign in with Google above to continue')}
                                    </p>
                                )}

                                <p className="text-xs text-center text-slate-500">
                                    {t('By signing up, you agree to our Terms of Service and Privacy Policy.')}
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
