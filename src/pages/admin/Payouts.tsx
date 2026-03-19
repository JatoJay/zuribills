import React, { useEffect, useMemo, useState } from 'react';
import { AgentLog, Organization } from '@/types';
import { getAgentLogsByOrg, updateOrganization } from '@/services/storage';
import { createPayoutAccount, fetchBanks, BankInfo, PayoutAccountPayload } from '@/services/paymentService';
import { resolveCountryCode, resolvePayoutProvider } from '@/services/paymentRouting';
import { Button, Input, Card, Select, Badge } from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { usePrompt } from '@/context/PromptContext';

const PLATFORM_FEE_PERCENT = 0.7;
const MOMO_MSISDN_RULES: Record<string, { countryCode: string; nationalLength: number; example: string }> = {
    RW: { countryCode: '250', nationalLength: 9, example: '+2507XXXXXXXX' },
    GH: { countryCode: '233', nationalLength: 9, example: '+2335XXXXXXX' },
    KE: { countryCode: '254', nationalLength: 9, example: '+2547XXXXXXXX' },
    ZA: { countryCode: '27', nationalLength: 9, example: '+278XXXXXXXX' },
};

const MOMO_NETWORK_KEYWORDS = /(momo|mobile|mtn|airtel|vodafone|mpesa|m-pesa|tigo|tigo cash)/i;
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

const Payouts: React.FC = () => {
    const { org, refreshOrg } = useAdminContext();
    const prompt = usePrompt();
    const translationStrings = useMemo(() => ([
        'Payouts & Payments',
        'Payments are disabled until a payout account is connected.',
        'Payout method',
        'Payout account connected',
        'Receiving Country',
        'Bank',
        'Bank Code',
        'Select a bank',
        'Select a network',
        'Account Number',
        'Account Name',
        'MoMo Wallet Number',
        'MoMo Wallet Name',
        'Mobile money network',
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
        'Platform fee',
        'ZuriBills fee per transaction.',
        'Payout status',
        'Latest payout',
        'Payout history',
        'No payout history yet.',
        'Date',
        'No payouts yet.',
        'Status',
        'Provider',
        'Method',
        'Reference',
        'Transfer ID',
    'Invoice',
    'Amount',
    'Updated',

        'Initiated',
        'Completed',
        'Failed',
        'Pending',
        'Enabled',
        'Disabled',
        'Payout account connected successfully.',
        'MoMo wallet connected successfully.',
        'Stripe payout connected successfully.',
        'Failed to connect payout account.',
        'Payout account disabled successfully.',
        'Failed to disable payout account.',
        'Are you sure you want to disable payouts? This will stop you from receiving payments.',
        'Disable Payouts',
        'Set your business country before connecting payouts.',
        'Please select a bank.',
        'Please enter your bank account number.',
        'Account number should be numeric.',
        'Account number should be 10 digits.',
        'Account number should be at least 6 digits.',
        'Please enter the bank account name.',
        'Please enter your MoMo wallet number.',
        'Please enter your MoMo wallet name.',
        'Please select a mobile money network.',
        'MoMo wallet number should include country code.',
        'Please enter your Stripe account ID.',
        'Loading banks...',
        'Loading...',
        'e.g. Nigeria or NG',
    ]), []);
    const { t } = useTranslation(translationStrings);
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
        catalogEnabled: true,
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
            provider: 'paystack',
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
    const [banks, setBanks] = useState<BankInfo[]>([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutLogs, setPayoutLogs] = useState<AgentLog[]>([]);
    const [payoutLogsLoading, setPayoutLogsLoading] = useState(false);

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
    const isPaystackProvider = payoutProvider === 'paystack';
    const isStripeProvider = payoutProvider === 'stripe';
    const mobileMoneyNetworkOptions = useMemo(() => {
        if (!isPaystackProvider) return [];
        if (!banks.length) return [];
        const filtered = banks.filter((bank) => MOMO_NETWORK_KEYWORDS.test(bank.name));
        return filtered.length ? filtered : banks;
    }, [banks, isPaystackProvider]);

    useEffect(() => {
        if (org) {
            const paymentConfig = org.paymentConfig || {
                enabled: false,
                provider: 'paystack',
                platformFeePercent: PLATFORM_FEE_PERCENT,
            };
            const inferredCountry = resolveCountryCode(paymentConfig.bankCountry, org.address?.country);
            const payoutProvider = resolvePayoutProvider(inferredCountry || paymentConfig.bankCountry);
            const isEnabled = payoutProvider === 'paystack'
                ? Boolean(paymentConfig.mobileNumber || paymentConfig.accountId)
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
            const formattedMobileNumber = paymentConfig.mobileNumber
                ? normalizeMomoMsisdn(paymentConfig.mobileNumber, payoutCountry).formatted || paymentConfig.mobileNumber
                : '';
            setPayoutForm({
                bankCountry: payoutCountry,
                bankCode: paymentConfig.bankCode || '',
                bankName: paymentConfig.bankName || '',
                accountNumber: '',
                accountName: paymentConfig.accountName || '',
                momoMsisdn: formattedMobileNumber,
                stripeAccountId: payoutProvider === 'stripe' ? paymentConfig.accountId || '' : '',
            });
        }
    }, [org]);

    useEffect(() => {
        if (!org.id) return;
        let cancelled = false;
        const loadPayoutLogs = async () => {
            setPayoutLogsLoading(true);
            try {
                const logs = await getAgentLogsByOrg(org.id);
                if (!cancelled) {
                    setPayoutLogs(logs.filter((log) => String(log.action || '').startsWith('PAYOUT_')));
                }
            } catch (error) {
                console.error('Failed to load payout logs', error);
                if (!cancelled) setPayoutLogs([]);
            } finally {
                if (!cancelled) setPayoutLogsLoading(false);
            }
        };
        loadPayoutLogs();
        return () => {
            cancelled = true;
        };
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
        if (isPaystackProvider && payoutForm.momoMsisdn) {
            const formatted = normalizeMomoMsisdn(payoutForm.momoMsisdn, resolvedPayoutCountry).formatted;
            if (formatted && formatted !== payoutForm.momoMsisdn) {
                setPayoutForm(prev => ({ ...prev, momoMsisdn: formatted }));
            }
        }
        if (isPaystackProvider && payoutForm.accountNumber) {
            const formatted = formatAccountNumberInput(payoutForm.accountNumber, resolvedPayoutCountry);
            if (formatted !== payoutForm.accountNumber) {
                setPayoutForm(prev => ({ ...prev, accountNumber: formatted }));
            }
        }
    }, [isPaystackProvider, payoutForm.accountNumber, payoutForm.momoMsisdn, resolvedPayoutCountry]);

    useEffect(() => {
        if (!isPaystackProvider) {
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
            const data = await fetchBanks(resolvedPayoutCountry, 'paystack');
            if (!cancelled) {
                setBanks(data);
                setBanksLoading(false);
            }
        };

        loadBanks().catch((error) => {
            if (!cancelled) {
                console.error('Failed to load banks', error);
                setBanks([]);
                setBanksLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [resolvedPayoutCountry, isPaystackProvider]);

    const payoutValidationError = useMemo(() => {
        if (!resolvedPayoutCountry) {
            return t('Set your business country before connecting payouts.');
        }
        if (isPaystackProvider) {
            const bankCode = payoutForm.bankCode.trim();
            const accountNumber = formatAccountNumberInput(payoutForm.accountNumber, resolvedPayoutCountry);
            const accountName = payoutForm.accountName.trim();
            const msisdn = momoState.normalized;
            if (bankCode && accountNumber) {
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
            if (msisdn) {
                if (!accountName) return t('Please enter your MoMo wallet name.');
                if (momoState.expectedLength && msisdn.length !== momoState.expectedLength) {
                    return t('MoMo wallet number should include country code.');
                }
                return '';
            }
            return t('Please enter bank account or mobile money details.');
        }
        if (isStripeProvider) {
            const accountId = payoutForm.stripeAccountId.trim();
            if (!accountId) return t('Please enter your Stripe account ID.');
        }
        return '';
    }, [accountRule, isPaystackProvider, isStripeProvider, momoState, payoutForm, resolvedPayoutCountry, t]);

    const handleBankChange = (value: string) => {
        const selected = banks.find((bank) => bank.code === value);
        setPayoutForm(prev => ({
            ...prev,
            bankCode: value,
            bankName: selected?.name || '',
        }));
    };

    const handleConnectPaystackPayout = async () => {
        if (!org.id) return;
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
        const mobileNumber = momoState.normalized;

        const payload: PayoutAccountPayload = {
            orgId: org.id,
            provider: 'paystack',
            bankCode,
            bankName,
            accountNumber: accountNumber || mobileNumber,
            accountName,
            bankCountry,
            mobileNumber: mobileNumber || undefined,
            mobileNetwork: bankName || undefined,
        };

        const result = await createPayoutAccount(payload);

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
                provider: 'paystack',
                accountId: result.accountId,
                bankName: result.bankName || payoutForm.bankName,
                bankCode: result.bankCode || payoutForm.bankCode,
                bankCountry: result.bankCountry || bankCountry,
                accountName: result.accountName || accountName,
                accountNumberLast4: result.accountNumberLast4,
                mobileNumber: mobileNumber || undefined,
                mobileNetwork: bankName || undefined,
                platformFeePercent: PLATFORM_FEE_PERCENT,
            },
        }));
        setPayoutForm(prev => ({ ...prev, accountNumber: '', momoMsisdn: '' }));
        setMessage({ type: 'success', text: t('Payout account connected successfully.') });
        if (refreshOrg) refreshOrg();
        setPayoutLoading(false);
    };

    const handleConnectStripePayout = async () => {
        if (!org.id) return;
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

    const handleDisablePayouts = async () => {
        if (!org.id) return;
        const confirmed = await prompt.confirm(t('Are you sure you want to disable payouts? This will stop you from receiving payments.'));
        if (!confirmed) return;

        setPayoutLoading(true);
        setMessage(null);

        const updated: Organization = {
            ...formData,
            paymentConfig: {
                enabled: false,
                provider: 'paystack',
                platformFeePercent: PLATFORM_FEE_PERCENT,
            } as any
        };

        try {
            await updateOrganization(updated);
            setFormData(updated);
            setPayoutForm({
                bankCountry: '',
                bankCode: '',
                bankName: '',
                accountNumber: '',
                accountName: '',
                momoMsisdn: '',
                stripeAccountId: '',
            });
            setMessage({ type: 'success', text: t('Payout account disabled successfully.') });
            if (refreshOrg) refreshOrg();
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || t('Failed to disable payout account.') });
        } finally {
            setPayoutLoading(false);
        }
    };

    const payoutAccountSummary = (() => {
        if (isPaystackProvider && formData.paymentConfig?.mobileNumber) {
            const last4 = formData.paymentConfig.mobileNumber.slice(-4);
            const network = formData.paymentConfig.mobileNetwork ? ` (${formData.paymentConfig.mobileNetwork})` : '';
            return `Mobile Money${network} - ${t('Ending in')} ${last4 || '----'}`;
        }
        if (isStripeProvider && formData.paymentConfig?.accountId) {
            return `Stripe - ${formData.paymentConfig.accountId}`;
        }
        if (formData.paymentConfig?.accountId) {
            return `${formData.paymentConfig?.bankName || t('Bank')} - ${t('Ending in')} ${formData.paymentConfig?.accountNumberLast4 || '----'}`;
        }
        return '';
    })();

    const payoutProviderLabel = isPaystackProvider ? 'Paystack' : 'Stripe';

    const canConnectPayout = !payoutValidationError && !payoutLoading;
    const payoutEntries = useMemo(() => payoutLogs.slice(0, 20), [payoutLogs]);
    const latestPayout = payoutEntries[0];
    const getPayoutStatusLabel = (action?: string) => {
        if (!action) return t('Pending');
        switch (action) {
            case 'PAYOUT_SENT':
            case 'PAYOUT_INITIATED':
                return t('Initiated');
            case 'PAYOUT_COMPLETED':
                return t('Completed');
            case 'PAYOUT_FAILED':
                return t('Failed');
            default:
                return t('Pending');
        }
    };
    const getPayoutStatusTone = (action?: string) => {
        if (!action) return 'text-slate-500';
        if (action === 'PAYOUT_COMPLETED') return 'text-emerald-600';
        if (action === 'PAYOUT_FAILED') return 'text-red-600';
        return 'text-amber-600';
    };
    const latestPayoutDetails = useMemo<Record<string, any>>(() => {
        if (!latestPayout?.details) return {};
        try {
            return JSON.parse(latestPayout.details);
        } catch {
            return {};
        }
    }, [latestPayout]);
    const payoutStatusLabel = latestPayout ? getPayoutStatusLabel(latestPayout.action) : '';
    const payoutStatusTone = latestPayout ? getPayoutStatusTone(latestPayout.action) : 'text-slate-500';
    const payoutHistoryRows = useMemo(() => payoutEntries.map((log) => {
        let details: Record<string, any> = {};
        try {
            details = JSON.parse(log.details || '{}');
        } catch {
            details = {};
        }
        return {
            log,
            details,
            statusLabel: getPayoutStatusLabel(log.action),
            statusTone: getPayoutStatusTone(log.action),
        };
    }), [payoutEntries, t]);

    if (!org.id) return <div className="p-8">{t('Loading...')}</div>;
    return (
        <div className="w-full space-y-6">
            <h2 className="text-2xl font-bold">{t('Payouts & Payments')}</h2>

            <Card className="p-6 space-y-6">
                {message && (
                    <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                        <AlertCircle className="w-4 h-4" />
                        {message.text}
                    </div>
                )}

                <div>
                    <p className="text-sm text-slate-500 mb-4">
                        {t('Payments are disabled until a payout account is connected.')}
                    </p>

                    <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                        <span className="text-emerald-800 font-medium">{t('Payout method')}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="font-bold text-emerald-900">{payoutProviderLabel} (Instant)</span>
                        </div>
                    </div>

                    {formData.paymentConfig?.enabled && payoutAccountSummary && (
                        <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            <div className="font-medium">{t('Payout account connected')}</div>
                            <div className="text-xs text-emerald-700/80">
                                {payoutAccountSummary}
                                {formData.paymentConfig?.accountName ? ` - ${formData.paymentConfig.accountName}` : ''}
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

                    {isPaystackProvider && (
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

                            <p className="text-xs text-slate-500 mt-4 mb-2">Or connect via Mobile Money:</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mobileMoneyNetworkOptions.length > 0 || banksLoading ? (
                                    <Select
                                        label={t('Mobile money network')}
                                        options={[
                                            { label: t('Select a network'), value: '' },
                                            ...mobileMoneyNetworkOptions.map((bank) => ({ label: bank.name, value: bank.code })),
                                        ]}
                                        value={payoutForm.bankCode}
                                        onChange={(e) => handleBankChange(e.target.value)}
                                        disabled={banksLoading}
                                    />
                                ) : (
                                    <Input
                                        label={t('Mobile money network')}
                                        value={payoutForm.bankCode}
                                        onChange={(e) => setPayoutForm(prev => ({
                                            ...prev,
                                            bankCode: e.target.value,
                                            bankName: e.target.value,
                                        }))}
                                    />
                                )}
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
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    isLoading={payoutLoading}
                                    disabled={!canConnectPayout}
                                    onClick={handleConnectPaystackPayout}
                                >
                                    {formData.paymentConfig?.accountId || formData.paymentConfig?.mobileNumber ? t('Update Payout Account') : t('Connect Payout Account')}
                                </Button>
                                {(formData.paymentConfig?.accountId || formData.paymentConfig?.mobileNumber) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        isLoading={payoutLoading}
                                        onClick={handleDisablePayouts}
                                    >
                                        {t('Disable Payouts')}
                                    </Button>
                                )}
                                {banksLoading && (
                                    <span className="text-xs text-slate-500">{t('Loading banks...')}</span>
                                )}
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
                                {formData.paymentConfig?.accountId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        isLoading={payoutLoading}
                                        onClick={handleDisablePayouts}
                                    >
                                        {t('Disable Payouts')}
                                    </Button>
                                )}
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
                    <p className="text-xs text-slate-500 mt-2">{t('ZuriBills fee per transaction.')}</p>

                    <div className="mt-4 rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">{t('Payout status')}</span>
                                <Badge status="ACTIVE" label="Real-time" />
                            </div>
                            {latestPayout && (
                                <span className={`text-xs font-semibold ${payoutStatusTone}`}>
                                    {payoutStatusLabel}
                                </span>
                            )}
                        </div>
                        {payoutLogsLoading ? (
                            <p className="mt-2 text-xs text-slate-500">{t('Loading...')}</p>
                        ) : latestPayout ? (
                            <div className="mt-2 space-y-2 text-xs text-slate-500">
                                <div className="font-medium text-slate-700">{t('Latest payout')}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-slate-600">{t('Updated')}:</span>{' '}
                                        {new Date(latestPayout.timestamp).toLocaleString()}
                                    </div>
                                    {latestPayoutDetails?.provider && (
                                        <div>
                                            <span className="text-slate-600">{t('Provider')}:</span>{' '}
                                            {latestPayoutDetails.provider}
                                        </div>
                                    )}
                                    {latestPayoutDetails?.method && (
                                        <div>
                                            <span className="text-slate-600">{t('Method')}:</span>{' '}
                                            {latestPayoutDetails.method}
                                        </div>
                                    )}
                                    {latestPayoutDetails?.reference && (
                                        <div>
                                            <span className="text-slate-600">{t('Reference')}:</span>{' '}
                                            {latestPayoutDetails.reference}
                                        </div>
                                    )}
                                    {latestPayoutDetails?.transferId && (
                                        <div>
                                            <span className="text-slate-600">{t('Transfer ID')}:</span>{' '}
                                            {latestPayoutDetails.transferId}
                                        </div>
                                    )}
                                </div>
                                {latestPayoutDetails?.error && (
                                    <div className="text-red-600">{latestPayoutDetails.error}</div>
                                )}
                            </div>
                        ) : (
                            <p className="mt-2 text-xs text-slate-500">{t('No payouts yet.')}</p>
                        )}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 bg-white">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-700">{t('Payout history')}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Date')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Status')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Amount')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Provider')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Method')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Reference')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Transfer ID')}</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">{t('Invoice')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payoutHistoryRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                                                {t('No payout history yet.')}
                                            </td>
                                        </tr>
                                    ) : (
                                        payoutHistoryRows.map(({ log, details, statusLabel, statusTone }) => (
                                            <tr key={log.id} className="hover:bg-slate-50/80">
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={`font-semibold ${statusTone}`}>{statusLabel}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-slate-900">
                                                    {details.amount ? `${details.currency || ''} ${details.amount.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {details.provider || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {details.method || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {details.reference || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {details.transferId || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {details.invoiceNumber || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Payouts;
