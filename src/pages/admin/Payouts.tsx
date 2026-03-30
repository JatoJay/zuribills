import React, { useEffect, useMemo, useState } from 'react';
import { AgentLog, Organization } from '@/types';
import { getAgentLogsByOrg, updateOrganization } from '@/services/storage';
import { Button, Input, Card, Select } from '@/components/ui';
import { AlertCircle, CheckCircle, Building2, CreditCard, Zap } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { usePrompt } from '@/context/PromptContext';

const PLATFORM_FEE_PERCENT = 0.7;

const COUNTRY_OPTIONS = [
    { label: 'Select country', value: '' },
    { label: 'Nigeria', value: 'NG' },
    { label: 'Ghana', value: 'GH' },
    { label: 'Kenya', value: 'KE' },
    { label: 'Rwanda', value: 'RW' },
    { label: 'South Africa', value: 'ZA' },
    { label: 'United States', value: 'US' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'Canada', value: 'CA' },
    { label: 'Germany', value: 'DE' },
    { label: 'France', value: 'FR' },
];

const Payouts: React.FC = () => {
    const { org, refreshOrg } = useAdminContext();
    const prompt = usePrompt();
    const translationStrings = useMemo(() => ([
        'Payouts & Payments',
        'How it works',
        'Customers pay via secure checkout',
        'Funds are automatically transferred to your bank',
        'No manual payouts needed - instant settlement',
        'Bank Account Details',
        'Enter your bank details to receive automatic payouts when customers pay.',
        'Country',
        'Bank Name',
        'Account Number',
        'Account Holder Name',
        'Routing Number / Sort Code',
        'Optional for some countries',
        'Save Payout Details',
        'Update Payout Details',
        'Payout account saved successfully.',
        'Failed to save payout account.',
        'Payments enabled',
        'Enabled',
        'Disabled',
        'Platform fee',
        'per transaction',
        'Payout History',
        'No payouts yet.',
        'Date',
        'Status',
        'Amount',
        'Reference',
        'Loading...',
        'Completed',
        'Pending',
        'Failed',
        'Disable Payouts',
        'Are you sure you want to disable payouts?',
        'Payout account disabled.',
        'Select country',
        'Your bank name',
        'Your account number',
        'Name on the account',
    ]), []);
    const { t } = useTranslation(translationStrings);

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [payoutForm, setPayoutForm] = useState({
        bankCountry: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        routingNumber: '',
    });
    const [payoutLogs, setPayoutLogs] = useState<AgentLog[]>([]);
    const [payoutLogsLoading, setPayoutLogsLoading] = useState(false);

    const isPayoutConfigured = Boolean(
        org.paymentConfig?.accountName &&
        org.paymentConfig?.bankName &&
        org.paymentConfig?.bankCountry
    );

    useEffect(() => {
        if (org?.paymentConfig) {
            setPayoutForm({
                bankCountry: org.paymentConfig.bankCountry || '',
                bankName: org.paymentConfig.bankName || '',
                accountNumber: '',
                accountName: org.paymentConfig.accountName || '',
                routingNumber: org.paymentConfig.routingNumber || '',
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
        return () => { cancelled = true; };
    }, [org.id]);

    const handleSave = async () => {
        if (!org.id) return;

        if (!payoutForm.bankCountry || !payoutForm.bankName || !payoutForm.accountName) {
            setMessage({ type: 'error', text: 'Please fill in all required fields.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const updated: Organization = {
                ...org,
                paymentConfig: {
                    ...org.paymentConfig,
                    enabled: true,
                    provider: 'polar',
                    bankCountry: payoutForm.bankCountry,
                    bankName: payoutForm.bankName,
                    accountName: payoutForm.accountName,
                    accountNumberLast4: payoutForm.accountNumber ? payoutForm.accountNumber.slice(-4) : org.paymentConfig?.accountNumberLast4,
                    routingNumber: payoutForm.routingNumber || undefined,
                    platformFeePercent: PLATFORM_FEE_PERCENT,
                },
            };

            await updateOrganization(updated);
            setMessage({ type: 'success', text: t('Payout account saved successfully.') });
            setPayoutForm(prev => ({ ...prev, accountNumber: '' }));
            if (refreshOrg) refreshOrg();
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || t('Failed to save payout account.') });
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!org.id) return;
        const confirmed = await prompt.confirm(t('Are you sure you want to disable payouts?'));
        if (!confirmed) return;

        setLoading(true);
        try {
            const updated: Organization = {
                ...org,
                paymentConfig: {
                    enabled: false,
                    provider: 'polar',
                    platformFeePercent: PLATFORM_FEE_PERCENT,
                },
            };
            await updateOrganization(updated);
            setPayoutForm({
                bankCountry: '',
                bankName: '',
                accountNumber: '',
                accountName: '',
                routingNumber: '',
            });
            setMessage({ type: 'success', text: t('Payout account disabled.') });
            if (refreshOrg) refreshOrg();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const payoutEntries = useMemo(() => payoutLogs.slice(0, 20), [payoutLogs]);

    const getStatusStyle = (action?: string) => {
        if (action === 'PAYOUT_COMPLETED') return 'text-emerald-600 bg-emerald-50';
        if (action === 'PAYOUT_FAILED') return 'text-red-600 bg-red-50';
        return 'text-amber-600 bg-amber-50';
    };

    const getStatusLabel = (action?: string) => {
        if (action === 'PAYOUT_COMPLETED') return t('Completed');
        if (action === 'PAYOUT_FAILED') return t('Failed');
        return t('Pending');
    };

    if (!org.id) return <div className="p-8">{t('Loading...')}</div>;

    return (
        <div className="w-full space-y-6">
            <h2 className="text-2xl font-bold">{t('Payouts & Payments')}</h2>

            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{t('How it works')}</h3>
                        <p className="text-sm text-muted">Automatic instant payouts powered by Polar</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">1. {t('Customers pay via secure checkout')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">2. {t('Funds are automatically transferred to your bank')}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">3. {t('No manual payouts needed - instant settlement')}</p>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm mb-6 ${
                        message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    }`}>
                        <AlertCircle className="w-4 h-4" />
                        {message.text}
                    </div>
                )}

                {isPayoutConfigured && (
                    <div className="mb-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            <span className="font-semibold text-emerald-800 dark:text-emerald-400">Payout account connected</span>
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            {org.paymentConfig?.bankName} • {org.paymentConfig?.accountName}
                            {org.paymentConfig?.accountNumberLast4 && ` • ****${org.paymentConfig.accountNumberLast4}`}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <h4 className="font-medium">{t('Bank Account Details')}</h4>
                    <p className="text-sm text-muted">{t('Enter your bank details to receive automatic payouts when customers pay.')}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label={t('Country')}
                            options={COUNTRY_OPTIONS}
                            value={payoutForm.bankCountry}
                            onChange={(e) => setPayoutForm(prev => ({ ...prev, bankCountry: e.target.value }))}
                        />
                        <Input
                            label={t('Bank Name')}
                            placeholder={t('Your bank name')}
                            value={payoutForm.bankName}
                            onChange={(e) => setPayoutForm(prev => ({ ...prev, bankName: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('Account Number')}
                            placeholder={t('Your account number')}
                            value={payoutForm.accountNumber}
                            onChange={(e) => setPayoutForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                        />
                        <Input
                            label={t('Account Holder Name')}
                            placeholder={t('Name on the account')}
                            value={payoutForm.accountName}
                            onChange={(e) => setPayoutForm(prev => ({ ...prev, accountName: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Input
                                label={t('Routing Number / Sort Code')}
                                placeholder={t('Optional for some countries')}
                                value={payoutForm.routingNumber}
                                onChange={(e) => setPayoutForm(prev => ({ ...prev, routingNumber: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <Button
                            onClick={handleSave}
                            isLoading={loading}
                            disabled={!payoutForm.bankCountry || !payoutForm.bankName || !payoutForm.accountName}
                        >
                            {isPayoutConfigured ? t('Update Payout Details') : t('Save Payout Details')}
                        </Button>
                        {isPayoutConfigured && (
                            <Button
                                variant="outline"
                                onClick={handleDisable}
                                isLoading={loading}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                                {t('Disable Payouts')}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">{t('Payments enabled')}</span>
                    <span className={`font-semibold ${org.paymentConfig?.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {org.paymentConfig?.enabled ? t('Enabled') : t('Disabled')}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-muted">{t('Platform fee')}</span>
                    <span className="font-semibold">{PLATFORM_FEE_PERCENT}% {t('per transaction')}</span>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="font-semibold mb-4">{t('Payout History')}</h3>
                {payoutLogsLoading ? (
                    <p className="text-sm text-muted">{t('Loading...')}</p>
                ) : payoutEntries.length === 0 ? (
                    <p className="text-sm text-muted">{t('No payouts yet.')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b">
                                <tr>
                                    <th className="text-left py-3 font-medium text-muted">{t('Date')}</th>
                                    <th className="text-left py-3 font-medium text-muted">{t('Status')}</th>
                                    <th className="text-left py-3 font-medium text-muted">{t('Amount')}</th>
                                    <th className="text-left py-3 font-medium text-muted">{t('Reference')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payoutEntries.map((log) => {
                                    let details: Record<string, any> = {};
                                    try { details = JSON.parse(log.details || '{}'); } catch {}
                                    return (
                                        <tr key={log.id}>
                                            <td className="py-3">{new Date(log.timestamp).toLocaleDateString()}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(log.action)}`}>
                                                    {getStatusLabel(log.action)}
                                                </span>
                                            </td>
                                            <td className="py-3 font-medium">
                                                {details.amount ? `${details.currency || ''} ${details.amount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="py-3 text-muted">{details.reference || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Payouts;
