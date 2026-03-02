
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Organization, EInvoicingConfig, DEFAULT_EINVOICING_CONFIG, NIGERIA_EINVOICING_PRESET, InvoiceNumberFormat } from '@/types';
import { updateOrganization, rotateSecurityStamp, getCurrentUserId } from '@/services/storage';
import { getSupabaseClient } from '@/services/supabaseClient';
import { Button, Input, Card, Select } from '@/components/ui';
import { Upload, ImageIcon, X, AlertCircle, ShieldAlert, MapPin, FileText } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';
import { detectLocationLanguage } from '@/services/geolocation';
import TwoFactorSetup from '@/components/TwoFactorSetup';

const PLATFORM_FEE_PERCENT = 0.7;

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
        'VAT Rate',
        'VAT rate applied to invoices (0-100%)',
        'Nigeria VAT (7.5%)',
        'No VAT',
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
        'Manage Payouts',
        'Manage payout accounts, bank details, and payout history in a dedicated page.',
        'Language & Localization',
        'Preferred Language',
        'Used by Gemini to translate onboarding and customer communications.',
        'Use My Location',
        'Detecting location...',
        'Set language based on your current location.',
        'Location detected:',
        'Could not detect location.',
        'Security',
        'Sign Out All Devices',
        'Invalidate all active sessions. You will need to sign in again on all devices.',
        'Revoking sessions...',
        'All sessions have been revoked. Please sign in again.',
        'Failed to revoke sessions.',
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
        'E-Invoicing Compliance',
        'Configure e-invoicing settings for regulatory compliance.',
        'Enable E-Invoicing',
        'Invoice Number Format',
        'Simple (INV-0001)',
        'Dated (INV-2502-0001)',
        'NITDA (INV0001)',
        'Invoice Prefix',
        'Include QR Code',
        'Show Seller TIN on Invoice',
        'Require Client TIN',
        'Require HSN/SAC Code',
        'Apply Nigeria Preset',
        'Reset to Default',
        'QR Code Fields',
        'Select which fields to include in the invoice QR code.',
        'Two-Factor Authentication',
        'Add an extra layer of security to your account.',
        'Enabled',
        'Disabled',
        'Enable 2FA',
        'Disable 2FA',
        'Scan this QR code with your authenticator app',
        'Or enter manually',
        'Secret Key',
        'Copied!',
        'Enter the 6-digit code to verify',
        'Verification Code',
        'Verify',
        'Cancel',
        'Disable Two-Factor Authentication',
        'You will need to set up 2FA again if you want to re-enable it.',
        '2FA settings saved',
        'Failed to update 2FA settings',
    ]), []);
    const { t, setLanguage } = useTranslation(translationStrings);
    const [loading, setLoading] = useState(false);
    const [revokingSession, setRevokingSession] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
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
        vatRate: 0,
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
        eInvoicingConfig: { ...DEFAULT_EINVOICING_CONFIG },
        createdAt: ''
    });

    useEffect(() => {
        if (org) {
            const paymentConfig = org.paymentConfig || {
                enabled: false,
                provider: 'flutterwave',
                platformFeePercent: PLATFORM_FEE_PERCENT,
            };
            const eInvoicingConfig = org.eInvoicingConfig || { ...DEFAULT_EINVOICING_CONFIG };
            setFormData({
                ...org,
                catalogEnabled: org.catalogEnabled ?? false,
                preferredLanguage: org.preferredLanguage || 'English',
                vatRate: org.vatRate ?? 0,
                address: org.address || { street: '', city: '', state: '', zip: '', country: '' },
                paymentConfig,
                eInvoicingConfig,
            });
        }
    }, [org]);

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

    const updateEInvoicing = <K extends keyof EInvoicingConfig>(field: K, value: EInvoicingConfig[K]) => {
        setFormData(prev => ({
            ...prev,
            eInvoicingConfig: {
                ...DEFAULT_EINVOICING_CONFIG,
                ...(prev.eInvoicingConfig || {}),
                [field]: value
            }
        }));
    };

    const applyNigeriaPreset = () => {
        setFormData(prev => ({
            ...prev,
            vatRate: 7.5,
            eInvoicingConfig: {
                ...DEFAULT_EINVOICING_CONFIG,
                ...NIGERIA_EINVOICING_PRESET,
            } as EInvoicingConfig
        }));
    };

    const resetEInvoicing = () => {
        setFormData(prev => ({
            ...prev,
            eInvoicingConfig: { ...DEFAULT_EINVOICING_CONFIG }
        }));
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only lowercase alphanumeric and single hyphens
        let val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        // Prevent multiple consecutive hyphens
        val = val.replace(/-+/g, '-');
        setFormData({ ...formData, slug: val });
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

    if (!org.id) return <div className="p-8">Loading...</div>;
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
                            <div>
                                <Input
                                    label={t('VAT Rate')}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    placeholder="0"
                                    value={formData.vatRate ?? 0}
                                    onChange={e => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setFormData({ ...formData, vatRate: Math.min(100, Math.max(0, value)) });
                                    }}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, vatRate: 7.5 })}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${formData.vatRate === 7.5 ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {t('Nigeria VAT (7.5%)')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, vatRate: 0 })}
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${formData.vatRate === 0 ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {t('No VAT')}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{t('VAT rate applied to invoices (0-100%)')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">{t('E-Invoicing Compliance')}</h3>
                                    <p className="text-xs text-slate-500">{t('Configure e-invoicing settings for regulatory compliance.')}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={applyNigeriaPreset}
                                    className="text-xs px-3 py-1.5 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                    {t('Apply Nigeria Preset')}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetEInvoicing}
                                    className="text-xs px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    {t('Reset to Default')}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{t('Enable E-Invoicing')}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.eInvoicingConfig?.enabled ?? false}
                                        onChange={(e) => updateEInvoicing('enabled', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 peer-checked:bg-primary transition-colors" />
                                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label={t('Invoice Number Format')}
                                    options={[
                                        { label: t('Simple (INV-0001)'), value: 'simple' },
                                        { label: t('Dated (INV-2502-0001)'), value: 'dated' },
                                        { label: t('NITDA (INV0001)'), value: 'nitda' },
                                    ]}
                                    value={formData.eInvoicingConfig?.invoiceNumberFormat || 'dated'}
                                    onChange={(e) => updateEInvoicing('invoiceNumberFormat', e.target.value as InvoiceNumberFormat)}
                                />
                                <Input
                                    label={t('Invoice Prefix')}
                                    placeholder="INV"
                                    value={formData.eInvoicingConfig?.invoiceNumberPrefix || 'INV'}
                                    onChange={(e) => updateEInvoicing('invoiceNumberPrefix', e.target.value.toUpperCase())}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.eInvoicingConfig?.includeQrCode ?? true}
                                        onChange={(e) => updateEInvoicing('includeQrCode', e.target.checked)}
                                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                    />
                                    <span className="text-sm text-slate-700">{t('Include QR Code')}</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.eInvoicingConfig?.showSellerTin ?? true}
                                        onChange={(e) => updateEInvoicing('showSellerTin', e.target.checked)}
                                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                    />
                                    <span className="text-sm text-slate-700">{t('Show Seller TIN on Invoice')}</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.eInvoicingConfig?.requireClientTin ?? false}
                                        onChange={(e) => updateEInvoicing('requireClientTin', e.target.checked)}
                                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                    />
                                    <span className="text-sm text-slate-700">{t('Require Client TIN')}</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={formData.eInvoicingConfig?.requireHsnCode ?? false}
                                        onChange={(e) => updateEInvoicing('requireHsnCode', e.target.checked)}
                                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                    />
                                    <span className="text-sm text-slate-700">{t('Require HSN/SAC Code')}</span>
                                </label>
                            </div>
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
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-medium">{t('Payouts & Payments')}</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t('Manage payout accounts, bank details, and payout history in a dedicated page.')}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate({ to: '/org/$slug/payouts', params: { slug: org.slug } })}
                            >
                                {t('Manage Payouts')}
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4">{t('Language & Localization')}</h3>
                        <div className="flex flex-col md:flex-row gap-4 md:items-end">
                            <div className="flex-1">
                                <Input
                                    label={t('Preferred Language')}
                                    list="language-options"
                                    value={formData.preferredLanguage || ''}
                                    onChange={e => {
                                        const nextLanguage = e.target.value;
                                        localStorage.setItem(LANGUAGE_SOURCE_KEY, 'user');
                                        setLanguage(nextLanguage);
                                        setFormData({ ...formData, preferredLanguage: nextLanguage });
                                    }}
                                />
                                <datalist id="language-options">
                                    {SUPPORTED_LANGUAGES.map(option => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 whitespace-nowrap"
                                isLoading={detectingLocation}
                                onClick={async () => {
                                    setDetectingLocation(true);
                                    try {
                                        const result = await detectLocationLanguage();
                                        if (result && result.language) {
                                            localStorage.setItem(LANGUAGE_SOURCE_KEY, 'location');
                                            setLanguage(result.language);
                                            setFormData(prev => ({ ...prev, preferredLanguage: result.language }));
                                            setMessage({ type: 'success', text: `${t('Location detected:')} ${result.countryCode} → ${result.language}` });
                                        } else {
                                            setMessage({ type: 'error', text: t('Could not detect location.') });
                                        }
                                    } catch {
                                        setMessage({ type: 'error', text: t('Could not detect location.') });
                                    } finally {
                                        setDetectingLocation(false);
                                    }
                                }}
                            >
                                <MapPin className="w-4 h-4 mr-2" />
                                {detectingLocation ? t('Detecting location...') : t('Use My Location')}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {t('Set language based on your current location.')}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            {t('Security')}
                        </h3>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 rounded-lg border border-red-200 bg-red-50">
                            <div>
                                <div className="text-sm font-medium text-red-900">{t('Sign Out All Devices')}</div>
                                <div className="text-xs text-red-700 mt-1">
                                    {t('Invalidate all active sessions. You will need to sign in again on all devices.')}
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-100"
                                isLoading={revokingSession}
                                onClick={async () => {
                                    setRevokingSession(true);
                                    try {
                                        const userId = getCurrentUserId();
                                        if (userId) {
                                            await rotateSecurityStamp(userId);
                                        }
                                        const supabase = getSupabaseClient();
                                        await supabase.auth.signOut();
                                        setMessage({ type: 'success', text: t('All sessions have been revoked. Please sign in again.') });
                                        setTimeout(() => {
                                            navigate({ to: '/login', search: { slug: org.slug } as any });
                                        }, 1500);
                                    } catch (err) {
                                        console.error(err);
                                        setMessage({ type: 'error', text: t('Failed to revoke sessions.') });
                                    } finally {
                                        setRevokingSession(false);
                                    }
                                }}
                            >
                                {t('Sign Out All Devices')}
                            </Button>
                        </div>

                        <div className="mt-6 p-4 rounded-lg border border-slate-200 bg-slate-50">
                            <TwoFactorSetup
                                translations={{
                                    title: t('Two-Factor Authentication'),
                                    description: t('Add an extra layer of security to your account.'),
                                    enabled: t('Enabled'),
                                    disabled: t('Disabled'),
                                    enable: t('Enable 2FA'),
                                    disable: t('Disable 2FA'),
                                    scanQrCode: t('Scan this QR code with your authenticator app'),
                                    orEnterManually: t('Or enter manually'),
                                    secretKey: t('Secret Key'),
                                    copied: t('Copied!'),
                                    enterCode: t('Enter the 6-digit code to verify'),
                                    verificationCode: t('Verification Code'),
                                    verify: t('Verify'),
                                    cancel: t('Cancel'),
                                    confirmDisable: t('Disable Two-Factor Authentication'),
                                    confirmDisableDesc: t('You will need to set up 2FA again if you want to re-enable it.'),
                                    success: t('2FA settings saved'),
                                    error: t('Failed to update 2FA settings'),
                                }}
                            />
                        </div>
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
