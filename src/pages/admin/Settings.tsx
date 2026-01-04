
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Organization } from '@/types';
import { updateOrganization } from '@/services/storage';
import { createFlutterwavePayoutAccount, fetchFlutterwaveBanks, FlutterwaveBank } from '@/services/paymentService';
import { resolveCountryCode, resolvePayoutProvider } from '@/services/paymentRouting';
import { Button, Input, Card, Select } from '@/components/ui';
import { Upload, ImageIcon, X, AlertCircle } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

const languageOptions = [
    'English',
    'French',
    'Spanish',
    'Portuguese',
    'Arabic',
    'Swahili',
    'Hausa',
    'Yoruba',
    'Igbo',
    'Nigerian Pidgin',
    'Hindi',
    'Bengali',
    'Chinese (Simplified)',
    'Chinese (Traditional)',
    'Japanese',
    'Korean',
    'German',
    'Italian',
    'Dutch',
    'Russian',
    'Turkish',
    'Indonesian',
    'Vietnamese',
];

const PLATFORM_FEE_PERCENT = 1.5;
const MOMO_MSISDN_RULES: Record<string, { countryCode: string; nationalLength: number; example: string }> = {
    RW: { countryCode: '250', nationalLength: 9, example: '+2507XXXXXXXX' },
    GH: { countryCode: '233', nationalLength: 9, example: '+2335XXXXXXX' },
    KE: { countryCode: '254', nationalLength: 9, example: '+2547XXXXXXXX' },
    ZA: { countryCode: '27', nationalLength: 9, example: '+278XXXXXXXX' },
};
const BANK_ACCOUNT_RULES: Record<string, { minLength: number; maxLength: number; example: string }> = {
    NG: { minLength: 10, maxLength: 10, example: '0123456789' },
};
const DEFAULT_ACCOUNT_RULE = { minLength: 6, maxLength: 18, example: '0123456789' };

const stripToDigits = (value: string) => value.replace(/\D/g, '');

const resolveMomoRule = (countryCode?: string) => {
    if (!countryCode) return undefined;
    return MOMO_MSISDN_RULES[countryCode];
};

const normalizeMomoMsisdn = (value: string, countryCode?: string) => {
    const rule = resolveMomoRule(countryCode);
    const digits = stripToDigits(value);

    if (!rule) {
        return {
            normalized: digits,
            formatted: digits ? `+${digits}` : '',
            expectedLength: 0,
            example: '',
        };
    }

    let normalized = digits;
    const expectedLength = rule.countryCode.length + rule.nationalLength;

    if (normalized.startsWith('0')) {
        normalized = rule.countryCode + normalized.slice(1);
    } else if (!normalized.startsWith(rule.countryCode) && normalized.length <= rule.nationalLength) {
        normalized = rule.countryCode + normalized;
    }

    if (normalized.length > expectedLength) {
        normalized = normalized.slice(0, expectedLength);
    }

    return {
        normalized,
        formatted: normalized ? `+${normalized}` : '',
        expectedLength,
        example: rule.example,
    };
};

const resolveAccountRule = (countryCode?: string) => {
    if (countryCode && BANK_ACCOUNT_RULES[countryCode]) {
        return BANK_ACCOUNT_RULES[countryCode];
    }
    return DEFAULT_ACCOUNT_RULE;
};

const formatAccountNumberInput = (value: string, countryCode?: string) => {
    const digits = stripToDigits(value);
    const rule = resolveAccountRule(countryCode);
    return digits.slice(0, rule.maxLength);
};

const Settings: React.FC = () => {
    const { org, refreshOrg } = useAdminContext();
    const navigate = useNavigate();
    const translationStrings = useMemo(() => ([
        'Organization Settings',
        'Organization Name',
        'Organization Logo',
        'Upload Logo',
        'Remove',
        'No Logo',
        'Recommended size: 200x200px.',
        'Supported formats: JPG, PNG. Max size: 500KB.',
        'Contact Email',
        'Contact Phone',
        'Public Catalog',
        'Publish catalog',
        'Enable a public catalog for customers to browse and pay online.',
        'Catalog URL Slug',
        'Public URL:',
        'Brand Color',
        'Tip: You can keep the catalog private and still use invoices, expenses, and reports.',
        'Tax & Compliance',
        'Tax ID',
        'Authorized Signatory',
        'Signatory Title',
        'Business Address',
        'Street Address',
        'City',
        'State',
        'Zip Code',
        'Country',
        'Billing & Currency',
        'Default Currency',
        'Payouts & Payments',
        'Payout method',
        'Payout account connected',
        'Receiving Country',
        'Bank',
        'Bank Code',
        'Select a bank',
        'Account Number',
        'Account Name',
        'MoMo Wallet Number',
        'MoMo Wallet Name',
        'Stripe Account ID',
        'Connect Payout Bank',
        'Update Payout Bank',
        'Connect MoMo Wallet',
        'Update MoMo Wallet',
        'Connect Stripe Account',
        'Update Stripe Account',
        'Ending in',
        'Required to receive payments directly into your bank account.',
        'Payments enabled',
        'Payments are disabled until a payout account is connected.',
        'Platform fee',
        'InvoiceFlow fee per transaction.',
        'Enabled',
        'Disabled',
        'Payout account connected successfully.',
        'MoMo wallet connected successfully.',
        'Stripe payout connected successfully.',
        'Failed to connect payout account.',
        'Set your business country before connecting payouts.',
        'Please select a bank.',
        'Please enter your bank account number.',
        'Account number should be numeric.',
        'Account number should be 10 digits.',
        'Account number should be at least 6 digits.',
        'Please enter the bank account name.',
        'Please enter your MoMo wallet number.',
        'Please enter your MoMo wallet name.',
        'MoMo wallet number should include country code.',
        'Please enter your Stripe account ID.',
        'Loading banks...',
        'Language & Localization',
        'Preferred Language',
        'Used by Gemini to translate onboarding and customer communications.',
        'Save Changes',
        'Settings saved successfully.',
        'Failed to save settings.',
        'Image size must be less than 500KB.',
        'Loading...',
        'e.g. TIN-12345',
        'Full name',
        'e.g. Founder & Managing Director',
        '123 Business Rd',
        'San Francisco',
        'CA',
        '94105',
        'USA',
        '+1 (555) 000-0000',
        'e.g. Nigeria or NG',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [formData, setFormData] = useState<Organization>({
        id: '',
        accountId: '',
        ownerId: '',
        name: '',
        slug: '',
        logoUrl: '',
        primaryColor: '',
        currency: 'USD',
        catalogEnabled: false,
        preferredLanguage: 'English',
        contactEmail: '',
        contactPhone: '',
        taxId: '',
        signatoryName: '',
        signatoryTitle: '',
        address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: ''
        },
        paymentConfig: {
            enabled: false,
            provider: 'flutterwave',
            platformFeePercent: PLATFORM_FEE_PERCENT,
        },
        createdAt: ''
    });
    const [payoutForm, setPayoutForm] = useState({
        bankCountry: '',
        bankCode: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        momoMsisdn: '',
        stripeAccountId: '',
    });
    const [banks, setBanks] = useState<FlutterwaveBank[]>([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const [payoutLoading, setPayoutLoading] = useState(false);

    const resolvedPayoutCountry = useMemo(
        () => resolveCountryCode(payoutForm.bankCountry, formData.address?.country),
        [payoutForm.bankCountry, formData.address?.country]
    );
    const accountRule = useMemo(
        () => resolveAccountRule(resolvedPayoutCountry),
        [resolvedPayoutCountry]
    );
    const momoState = useMemo(
        () => normalizeMomoMsisdn(payoutForm.momoMsisdn, resolvedPayoutCountry),
        [payoutForm.momoMsisdn, resolvedPayoutCountry]
    );
    const payoutProvider = resolvePayoutProvider(resolvedPayoutCountry);
    const isFlutterwaveProvider = payoutProvider === 'flutterwave';
    const isMomoProvider = payoutProvider === 'momo';
    const isStripeProvider = payoutProvider === 'stripe';

    useEffect(() => {
        if (org) {
            const paymentConfig = org.paymentConfig || {
                enabled: false,
                provider: 'flutterwave',
                platformFeePercent: PLATFORM_FEE_PERCENT,
            };
            const inferredCountry = resolveCountryCode(paymentConfig.bankCountry, org.address?.country);
            const payoutProvider = resolvePayoutProvider(inferredCountry || paymentConfig.bankCountry);
            const isEnabled = payoutProvider === 'momo'
                ? Boolean(paymentConfig.momoMsisdn)
                : Boolean(paymentConfig.accountId);
            setFormData({
                ...org,
                catalogEnabled: org.catalogEnabled ?? false,
                preferredLanguage: org.preferredLanguage || 'English',
                address: org.address || { street: '', city: '', state: '', zip: '', country: '' },
                paymentConfig: {
                    ...paymentConfig,
                    provider: payoutProvider,
                    bankCountry: inferredCountry || paymentConfig.bankCountry,
                    platformFeePercent: paymentConfig.platformFeePercent ?? PLATFORM_FEE_PERCENT,
                    enabled: isEnabled,
                },
            });
            const payoutCountry = inferredCountry || paymentConfig.bankCountry || '';
            const formattedMomoMsisdn = paymentConfig.momoMsisdn
                ? normalizeMomoMsisdn(paymentConfig.momoMsisdn, payoutCountry).formatted || paymentConfig.momoMsisdn
                : '';
            setPayoutForm({
                bankCountry: payoutCountry,
                bankCode: paymentConfig.bankCode || '',
                bankName: paymentConfig.bankName || '',
                accountNumber: '',
                accountName: paymentConfig.momoAccountName || paymentConfig.accountName || '',
                momoMsisdn: formattedMomoMsisdn,
                stripeAccountId: payoutProvider === 'stripe' ? paymentConfig.accountId || '' : '',
            });
        }
    }, [org]);

    useEffect(() => {
        if (!payoutForm.bankCountry && formData.address?.country) {
            const resolved = resolveCountryCode('', formData.address.country);
            if (resolved) {
                setPayoutForm(prev => ({ ...prev, bankCountry: resolved }));
            }
        }
    }, [formData.address?.country, payoutForm.bankCountry]);

    useEffect(() => {
        if (isMomoProvider && payoutForm.momoMsisdn) {
            const formatted = normalizeMomoMsisdn(payoutForm.momoMsisdn, resolvedPayoutCountry).formatted;
            if (formatted && formatted !== payoutForm.momoMsisdn) {
                setPayoutForm(prev => ({ ...prev, momoMsisdn: formatted }));
            }
        }
        if (isFlutterwaveProvider && payoutForm.accountNumber) {
            const formatted = formatAccountNumberInput(payoutForm.accountNumber, resolvedPayoutCountry);
            if (formatted !== payoutForm.accountNumber) {
                setPayoutForm(prev => ({ ...prev, accountNumber: formatted }));
            }
        }
    }, [isFlutterwaveProvider, isMomoProvider, payoutForm.accountNumber, payoutForm.momoMsisdn, resolvedPayoutCountry]);

    useEffect(() => {
        if (!isFlutterwaveProvider) {
            setBanks([]);
            setBanksLoading(false);
            return;
        }
        if (!resolvedPayoutCountry) {
            setBanks([]);
            setBanksLoading(false);
            return;
        }

        let cancelled = false;

        const loadBanks = async () => {
            setBanksLoading(true);
            const data = await fetchFlutterwaveBanks(resolvedPayoutCountry);
            if (!cancelled) {
                setBanks(data);
                setBanksLoading(false);
            }
        };

        loadBanks().catch((error) => {
            if (!cancelled) {
                console.error('Failed to load Flutterwave banks', error);
                setBanks([]);
                setBanksLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [resolvedPayoutCountry, isFlutterwaveProvider]);

    const payoutValidationError = useMemo(() => {
        if (!resolvedPayoutCountry) {
            return t('Set your business country before connecting payouts.');
        }
        if (isFlutterwaveProvider) {
            const bankCode = payoutForm.bankCode.trim();
            const accountNumber = formatAccountNumberInput(payoutForm.accountNumber, resolvedPayoutCountry);
            const accountName = payoutForm.accountName.trim();
            if (!bankCode) return t('Please select a bank.');
            if (!accountNumber) return t('Please enter your bank account number.');
            if (!/^\d+$/.test(accountNumber)) return t('Account number should be numeric.');
            if (accountRule.minLength === accountRule.maxLength && accountNumber.length !== accountRule.minLength) {
                return t('Account number should be 10 digits.');
            }
            if (accountRule.minLength !== accountRule.maxLength && accountNumber.length < accountRule.minLength) {
                return t('Account number should be at least 6 digits.');
            }
            if (!accountName) return t('Please enter the bank account name.');
            return '';
        }
        if (isMomoProvider) {
            const msisdn = momoState.normalized;
            const accountName = payoutForm.accountName.trim();
            if (!msisdn) return t('Please enter your MoMo wallet number.');
            if (!accountName) return t('Please enter your MoMo wallet name.');
            if (momoState.expectedLength && msisdn.length !== momoState.expectedLength) {
                return t('MoMo wallet number should include country code.');
            }
            return '';
        }
        if (isStripeProvider) {
            const accountId = payoutForm.stripeAccountId.trim();
            if (!accountId) return t('Please enter your Stripe account ID.');
        }
        return '';
    }, [accountRule, isFlutterwaveProvider, isMomoProvider, isStripeProvider, momoState, payoutForm, resolvedPayoutCountry, t]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) {
                setMessage({ type: 'error', text: t('Image size must be less than 500KB.') });
                e.target.value = ''; // Reset input
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
                setMessage(null);
            };
            reader.readAsDataURL(file);
        }
        // Reset input to allow re-selecting the same file if needed
        e.target.value = '';
    };

    const updateAddress = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: {
                street: '', city: '', state: '', zip: '', country: '',
                ...(prev.address || {}),
                [field]: value
            }
        }));
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only lowercase alphanumeric and single hyphens
        let val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        // Prevent multiple consecutive hyphens
        val = val.replace(/-+/g, '-');
        setFormData({ ...formData, slug: val });
    };

    const handleBankChange = (value: string) => {
        const selected = banks.find((bank) => bank.code === value);
        setPayoutForm(prev => ({
            ...prev,
            bankCode: value,
            bankName: selected?.name || '',
        }));
    };

    const handleConnectFlutterwavePayout = async () => {
        if (!org) return;
        setPayoutLoading(true);
        setMessage(null);

        if (payoutValidationError) {
            setMessage({ type: 'error', text: payoutValidationError });
            setPayoutLoading(false);
            return;
        }

        const bankCountry = resolvedPayoutCountry;
        const bankCode = payoutForm.bankCode.trim();
        const bankName = payoutForm.bankName.trim() || undefined;
        const accountNumber = formatAccountNumberInput(payoutForm.accountNumber, resolvedPayoutCountry);
        const accountName = payoutForm.accountName.trim();

        const result = await createFlutterwavePayoutAccount({
            orgId: org.id,
            bankCode,
            bankName,
            accountNumber,
            accountName,
            bankCountry,
        });

        if (!result.success) {
            setMessage({ type: 'error', text: result.error || t('Failed to connect payout account.') });
            setPayoutLoading(false);
            return;
        }

        setFormData(prev => ({
            ...prev,
            paymentConfig: {
                ...(prev.paymentConfig || {}),
                enabled: true,
                provider: 'flutterwave',
                accountId: result.accountId,
                bankName: result.bankName || payoutForm.bankName,
                bankCode: result.bankCode || payoutForm.bankCode,
                bankCountry: result.bankCountry || bankCountry,
                accountName: result.accountName || accountName,
                accountNumberLast4: result.accountNumberLast4,
                platformFeePercent: PLATFORM_FEE_PERCENT,
            },
        }));
        setPayoutForm(prev => ({ ...prev, accountNumber: '' }));
        setMessage({ type: 'success', text: t('Payout account connected successfully.') });
        if (refreshOrg) refreshOrg();
        setPayoutLoading(false);
    };

    const handleConnectMomoPayout = async () => {
        if (!org) return;
        setPayoutLoading(true);
        setMessage(null);

        if (payoutValidationError) {
            setMessage({ type: 'error', text: payoutValidationError });
            setPayoutLoading(false);
            return;
        }

        const msisdn = momoState.normalized;
        const accountName = payoutForm.accountName.trim();
        const bankCountry = resolvedPayoutCountry;

        const updated: Organization = {
            ...formData,
            paymentConfig: {
                ...(formData.paymentConfig || {}),
                enabled: true,
                provider: 'momo',
                bankCountry,
                momoMsisdn: msisdn,
                momoAccountName: accountName || undefined,
                platformFeePercent: PLATFORM_FEE_PERCENT,
            },
        };

        try {
            await updateOrganization(updated);
            setFormData(updated);
            setMessage({ type: 'success', text: t('MoMo wallet connected successfully.') });
            if (refreshOrg) refreshOrg();
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || t('Failed to connect payout account.') });
        } finally {
            setPayoutLoading(false);
        }
    };

    const handleConnectStripePayout = async () => {
        if (!org) return;
        setPayoutLoading(true);
        setMessage(null);

        if (payoutValidationError) {
            setMessage({ type: 'error', text: payoutValidationError });
            setPayoutLoading(false);
            return;
        }

        const accountId = payoutForm.stripeAccountId.trim();
        const bankCountry = resolvedPayoutCountry;

        const updated: Organization = {
            ...formData,
            paymentConfig: {
                ...(formData.paymentConfig || {}),
                enabled: true,
                provider: 'stripe',
                bankCountry,
                accountId,
                platformFeePercent: PLATFORM_FEE_PERCENT,
            },
        };

        try {
            await updateOrganization(updated);
            setFormData(updated);
            setMessage({ type: 'success', text: t('Stripe payout connected successfully.') });
            if (refreshOrg) refreshOrg();
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || t('Failed to connect payout account.') });
        } finally {
            setPayoutLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await updateOrganization(formData);
            setMessage({ type: 'success', text: t('Settings saved successfully.') });

            // If slug changed, we must redirect to the new URL
            if (org && formData.slug !== org.slug) {
                navigate({ to: '/org/$slug/settings', params: { slug: formData.slug }, replace: true });
            } else {
                if (refreshOrg) refreshOrg();
            }

        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: err.message || t('Failed to save settings.') });
        } finally {
            setLoading(false);
        }
    };

    const payoutAccountSummary = (() => {
        if (isMomoProvider && formData.paymentConfig?.momoMsisdn) {
            const last4 = formData.paymentConfig.momoMsisdn.slice(-4);
            return `MoMo - ${t('Ending in')} ${last4 || '----'}`;
        }
        if (isStripeProvider && formData.paymentConfig?.accountId) {
            return `Stripe - ${formData.paymentConfig.accountId}`;
        }
        if (formData.paymentConfig?.accountId) {
            return `${formData.paymentConfig?.bankName || t('Bank')} - ${t('Ending in')} ${formData.paymentConfig?.accountNumberLast4 || '----'}`;
        }
        return '';
    })();

    const payoutProviderLabel = isMomoProvider ? 'MoMo' : isFlutterwaveProvider ? 'Flutterwave' : 'Stripe';

    const canConnectPayout = !payoutValidationError && !payoutLoading;

    if (!org) return <div>{t('Loading...')}</div>;

    return (
        <div className="w-full space-y-6">
            <h2 className="text-2xl font-bold">{t('Organization Settings')}</h2>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {message && (
                        <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                            }`}>
                            <AlertCircle className="w-4 h-4" />
                            {message.text}
                        </div>
                    )}

                    <div>
                        <Input
                            label={t('Organization Name')}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* Logo Upload Section */}
                    <div>
                        <label className="text-sm font-medium leading-none mb-3 block">{t('Organization Logo')}</label>
                        <div className="flex items-start gap-6">
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center group">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Org Logo" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <ImageIcon className="h-8 w-8 mb-1" />
                                        <span className="text-[10px] uppercase font-bold">{t('No Logo')}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 border border-border bg-background hover:bg-foreground/5 text-foreground h-9 py-2 px-4 shadow-sm">
                                        <Upload className="w-4 h-4 mr-2" />
                                        {t('Upload Logo')}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                        />
                                    </label>
                                    {formData.logoUrl && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-9 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                            onClick={() => setFormData({ ...formData, logoUrl: '' })}
                                        >
                                            <X className="w-4 h-4 mr-2" /> {t('Remove')}
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {t('Recommended size: 200x200px.')} <br />
                                    {t('Supported formats: JPG, PNG. Max size: 500KB.')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t('Contact Email')}
                            type="email"
                            value={formData.contactEmail}
                            onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                            required
                        />
                        <Input
                            label={t('Contact Phone')}
                            type="tel"
                            placeholder={t('+1 (555) 000-0000')}
                            value={formData.contactPhone || ''}
                            onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4">{t('Public Catalog')}</h3>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                                <div className="text-sm font-medium text-slate-900">{t('Publish catalog')}</div>
                                <div className="text-xs text-slate-500">{t('Enable a public catalog for customers to browse and pay online.')}</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.catalogEnabled}
                                    onChange={(e) => setFormData({ ...formData, catalogEnabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 peer-checked:bg-primary transition-colors" />
                                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div>
                                <Input
                                    label={t('Catalog URL Slug')}
                                    value={formData.slug}
                                    onChange={handleSlugChange}
                                    required
                                />
                                <p className="text-xs text-slate-500 mt-1.5 ml-0.5">
                                    {t('Public URL:')} <span className="font-mono bg-slate-100 px-1 rounded">/catalog/{formData.slug || 'slug'}</span>
                                </p>
                            </div>
                            <Input
                                label={t('Brand Color')}
                                type="color"
                                className="h-10 p-1"
                                value={formData.primaryColor}
                                onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {t('Tip: You can keep the catalog private and still use invoices, expenses, and reports.')}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4">{t('Tax & Compliance')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label={t('Tax ID')}
                                placeholder={t('e.g. TIN-12345')}
                                value={formData.taxId || ''}
                                onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                            />
                            <Input
                                label={t('Authorized Signatory')}
                                placeholder={t('Full name')}
                                value={formData.signatoryName || ''}
                                onChange={e => setFormData({ ...formData, signatoryName: e.target.value })}
                            />
                        </div>
                        <div className="mt-4">
                            <Input
                                label={t('Signatory Title')}
                                placeholder={t('e.g. Founder & Managing Director')}
                                value={formData.signatoryTitle || ''}
                                onChange={e => setFormData({ ...formData, signatoryTitle: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4">{t('Business Address')}</h3>
                        <div className="space-y-4">
                            <Input
                                label={t('Street Address')}
                                placeholder={t('123 Business Rd')}
                                value={formData.address?.street}
                                onChange={(e) => updateAddress('street', e.target.value)}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label={t('City')}
                                    placeholder={t('San Francisco')}
                                    value={formData.address?.city}
                                    onChange={(e) => updateAddress('city', e.target.value)}
                                />
                                <Input
                                    label={t('State')}
                                    placeholder={t('CA')}
                                    value={formData.address?.state}
                                    onChange={(e) => updateAddress('state', e.target.value)}
                                />
                                <Input
                                    label={t('Zip Code')}
                                    placeholder={t('94105')}
                                    value={formData.address?.zip}
                                    onChange={(e) => updateAddress('zip', e.target.value)}
                                />
                            </div>
                            <Input
                                label={t('Country')}
                                placeholder={t('USA')}
                                value={formData.address?.country}
                                onChange={(e) => updateAddress('country', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4">{t('Billing & Currency')}</h3>
                        <Select
                            label={t('Default Currency')}
                            options={[
                                { label: 'USD ($)', value: 'USD' },
                                { label: 'CAD (CA$)', value: 'CAD' },
                                { label: 'NGN (₦)', value: 'NGN' },
                                { label: 'GHS (GH₵)', value: 'GHS' },
                                { label: 'KES (KSh)', value: 'KES' },
                                { label: 'ZAR (R)', value: 'ZAR' },
                                { label: 'EUR (€)', value: 'EUR' },
                                { label: 'GBP (£)', value: 'GBP' },
                                { label: 'RWF (RWF)', value: 'RWF' },
                            ]}
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-2">{t('Payouts & Payments')}</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            {t('Payments are disabled until a payout account is connected.')}
                        </p>

                        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                            <span className="text-slate-600">{t('Payout method')}</span>
                            <span className="font-semibold text-slate-900">{payoutProviderLabel}</span>
                        </div>

                        {formData.paymentConfig?.enabled && payoutAccountSummary && (
                            <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                <div className="font-medium">{t('Payout account connected')}</div>
                                <div className="text-xs text-emerald-700/80">
                                    {payoutAccountSummary}
                                    {isMomoProvider && formData.paymentConfig?.momoAccountName
                                        ? ` - ${formData.paymentConfig.momoAccountName}`
                                        : (!isMomoProvider && formData.paymentConfig?.accountName ? ` - ${formData.paymentConfig.accountName}` : '')}
                                </div>
                            </div>
                        )}

                        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={t('Receiving Country')}
                                placeholder={t('e.g. Nigeria or NG')}
                                value={payoutForm.bankCountry}
                                onChange={(e) => setPayoutForm(prev => ({ ...prev, bankCountry: e.target.value }))}
                            />
                        </div>

                        {isFlutterwaveProvider && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {banks.length > 0 || banksLoading ? (
                                        <Select
                                            label={t('Bank')}
                                            options={[
                                                { label: t('Select a bank'), value: '' },
                                                ...banks.map((bank) => ({ label: bank.name, value: bank.code })),
                                            ]}
                                            value={payoutForm.bankCode}
                                            onChange={(e) => handleBankChange(e.target.value)}
                                            disabled={banksLoading}
                                        />
                                    ) : (
                                        <Input
                                            label={t('Bank Code')}
                                            value={payoutForm.bankCode}
                                            onChange={(e) => setPayoutForm(prev => ({
                                                ...prev,
                                                bankCode: e.target.value,
                                                bankName: '',
                                            }))}
                                        />
                                    )}
                                    <Input
                                        label={t('Account Number')}
                                        value={payoutForm.accountNumber}
                                        inputMode="numeric"
                                        placeholder={accountRule.example}
                                        maxLength={accountRule.maxLength}
                                        onChange={(e) => setPayoutForm(prev => ({
                                            ...prev,
                                            accountNumber: formatAccountNumberInput(e.target.value, resolvedPayoutCountry),
                                        }))}
                                    />
                                </div>

                                <div className="mt-4">
                                    <Input
                                        label={t('Account Name')}
                                        value={payoutForm.accountName}
                                        onChange={(e) => setPayoutForm(prev => ({ ...prev, accountName: e.target.value }))}
                                    />
                                </div>

                                <div className="mt-4 flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        isLoading={payoutLoading}
                                        disabled={!canConnectPayout}
                                        onClick={handleConnectFlutterwavePayout}
                                    >
                                        {formData.paymentConfig?.accountId ? t('Update Payout Bank') : t('Connect Payout Bank')}
                                    </Button>
                                    {banksLoading && (
                                        <span className="text-xs text-slate-500">{t('Loading banks...')}</span>
                                    )}
                                </div>
                            </>
                        )}

                        {isMomoProvider && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label={t('MoMo Wallet Number')}
                                        value={payoutForm.momoMsisdn}
                                        inputMode="tel"
                                        placeholder={momoState.example || '+<country code><number>'}
                                        onChange={(e) => {
                                            const formatted = normalizeMomoMsisdn(e.target.value, resolvedPayoutCountry).formatted;
                                            setPayoutForm(prev => ({ ...prev, momoMsisdn: formatted }));
                                        }}
                                    />
                                    <Input
                                        label={t('MoMo Wallet Name')}
                                        value={payoutForm.accountName}
                                        onChange={(e) => setPayoutForm(prev => ({ ...prev, accountName: e.target.value }))}
                                    />
                                </div>
                                <div className="mt-4 flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        isLoading={payoutLoading}
                                        disabled={!canConnectPayout}
                                        onClick={handleConnectMomoPayout}
                                    >
                                        {formData.paymentConfig?.momoMsisdn ? t('Update MoMo Wallet') : t('Connect MoMo Wallet')}
                                    </Button>
                                </div>
                            </>
                        )}

                        {isStripeProvider && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label={t('Stripe Account ID')}
                                        value={payoutForm.stripeAccountId}
                                        onChange={(e) => setPayoutForm(prev => ({ ...prev, stripeAccountId: e.target.value }))}
                                    />
                                </div>
                                <div className="mt-4 flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        isLoading={payoutLoading}
                                        disabled={!canConnectPayout}
                                        onClick={handleConnectStripePayout}
                                    >
                                        {formData.paymentConfig?.accountId ? t('Update Stripe Account') : t('Connect Stripe Account')}
                                    </Button>
                                </div>
                            </>
                        )}

                        {payoutValidationError && (
                            <p className="mt-3 text-xs text-amber-600">
                                {payoutValidationError}
                            </p>
                        )}

                        <p className="text-xs text-slate-500 mt-2">
                            {t('Required to receive payments directly into your bank account.')}
                        </p>
                        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                            <span className="font-medium text-slate-700">{t('Payments enabled')}</span>
                            <span className={formData.paymentConfig?.enabled ? 'font-semibold text-emerald-600' : 'font-semibold text-slate-400'}>
                                {formData.paymentConfig?.enabled ? t('Enabled') : t('Disabled')}
                            </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm">
                            <span className="text-slate-600">{t('Platform fee')}</span>
                            <span className="font-semibold text-slate-900">{PLATFORM_FEE_PERCENT}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{t('InvoiceFlow fee per transaction.')}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4">{t('Language & Localization')}</h3>
                        <Input
                            label={t('Preferred Language')}
                            list="language-options"
                            value={formData.preferredLanguage || ''}
                            onChange={e => setFormData({ ...formData, preferredLanguage: e.target.value })}
                        />
                        <datalist id="language-options">
                            {languageOptions.map(option => (
                                <option key={option} value={option} />
                            ))}
                        </datalist>
                        <p className="text-xs text-slate-500 mt-2">
                            {t('Used by Gemini to translate onboarding and customer communications.')}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <Button type="submit" isLoading={loading}>
                            {t('Save Changes')}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Settings;
