
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Organization } from '@/types';
import { updateOrganization } from '@/services/storage';
import { createFlutterwavePayoutAccount, fetchFlutterwaveBanks, FlutterwaveBank } from '@/services/paymentService';
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

const payoutCountryOptions = [
    { label: 'Nigeria (NG)', value: 'NG' },
    { label: 'Ghana (GH)', value: 'GH' },
    { label: 'Kenya (KE)', value: 'KE' },
    { label: 'Rwanda (RW)', value: 'RW' },
    { label: 'South Africa (ZA)', value: 'ZA' },
];

const PLATFORM_FEE_PERCENT = 1.5;

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
        'Payout bank connected',
        'Bank Country',
        'Bank',
        'Bank Code',
        'Select a bank',
        'Account Number',
        'Account Name',
        'Connect Payout Bank',
        'Update Payout Bank',
        'Ending in',
        'Required to receive payments directly into your bank account.',
        'Payments enabled',
        'Payments are disabled until a payout bank is connected.',
        'Platform fee',
        'InvoiceFlow fee per transaction.',
        'Enabled',
        'Disabled',
        'Payout bank connected successfully.',
        'Failed to connect payout account.',
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
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [payoutForm, setPayoutForm] = useState({
        bankCountry: 'NG',
        bankCode: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
    });
    const [banks, setBanks] = useState<FlutterwaveBank[]>([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const [payoutLoading, setPayoutLoading] = useState(false);

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

    useEffect(() => {
        if (org) {
            const paymentConfig = org.paymentConfig || {
                enabled: false,
                provider: 'flutterwave',
                platformFeePercent: PLATFORM_FEE_PERCENT,
            };
            setFormData({
                ...org,
                catalogEnabled: org.catalogEnabled ?? false,
                preferredLanguage: org.preferredLanguage || 'English',
                address: org.address || { street: '', city: '', state: '', zip: '', country: '' },
                paymentConfig: {
                    ...paymentConfig,
                    provider: 'flutterwave',
                    platformFeePercent: paymentConfig.platformFeePercent ?? PLATFORM_FEE_PERCENT,
                    enabled: Boolean(paymentConfig.accountId),
                },
            });
            setPayoutForm({
                bankCountry: paymentConfig.bankCountry || 'NG',
                bankCode: paymentConfig.bankCode || '',
                bankName: paymentConfig.bankName || '',
                accountNumber: '',
                accountName: paymentConfig.accountName || '',
            });
        }
    }, [org]);

    useEffect(() => {
        let cancelled = false;

        const loadBanks = async () => {
            setBanksLoading(true);
            const data = await fetchFlutterwaveBanks(payoutForm.bankCountry);
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
    }, [payoutForm.bankCountry]);

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

    const handleConnectPayout = async () => {
        if (!org) return;
        setPayoutLoading(true);
        setMessage(null);

        const result = await createFlutterwavePayoutAccount({
            orgId: org.id,
            bankCode: payoutForm.bankCode,
            bankName: payoutForm.bankName,
            accountNumber: payoutForm.accountNumber,
            accountName: payoutForm.accountName,
            bankCountry: payoutForm.bankCountry,
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
                bankCountry: result.bankCountry || payoutForm.bankCountry,
                accountName: result.accountName || payoutForm.accountName,
                accountNumberLast4: result.accountNumberLast4,
                platformFeePercent: PLATFORM_FEE_PERCENT,
            },
        }));
        setPayoutForm(prev => ({ ...prev, accountNumber: '' }));
        setMessage({ type: 'success', text: t('Payout bank connected successfully.') });
        if (refreshOrg) refreshOrg();
        setPayoutLoading(false);
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

    const payoutAccountSummary = formData.paymentConfig?.accountId
        ? `${formData.paymentConfig?.bankName || t('Bank')} - ${t('Ending in')} ${formData.paymentConfig?.accountNumberLast4 || '----'}`
        : '';
    const canConnectPayout = Boolean(payoutForm.bankCode && payoutForm.accountNumber && !payoutLoading);

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
                            {t('Payments are disabled until a payout bank is connected.')}
                        </p>

                        {formData.paymentConfig?.accountId && (
                            <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                <div className="font-medium">{t('Payout bank connected')}</div>
                                <div className="text-xs text-emerald-700/80">
                                    {payoutAccountSummary}
                                    {formData.paymentConfig?.accountName ? ` - ${formData.paymentConfig.accountName}` : ''}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label={t('Bank Country')}
                                options={payoutCountryOptions}
                                value={payoutForm.bankCountry}
                                onChange={(e) => setPayoutForm(prev => ({
                                    ...prev,
                                    bankCountry: e.target.value,
                                    bankCode: '',
                                    bankName: '',
                                }))}
                            />
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Input
                                label={t('Account Number')}
                                value={payoutForm.accountNumber}
                                inputMode="numeric"
                                onChange={(e) => setPayoutForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                            />
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
                                onClick={handleConnectPayout}
                            >
                                {formData.paymentConfig?.accountId ? t('Update Payout Bank') : t('Connect Payout Bank')}
                            </Button>
                            {banksLoading && (
                                <span className="text-xs text-slate-500">{t('Loading banks...')}</span>
                            )}
                        </div>

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
