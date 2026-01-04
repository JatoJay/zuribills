import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { InvoiceStatus } from '@/types';
import { createInvoice } from '@/services/storage';
import { Button, Input, Card, Select, formatCurrency } from '@/components/ui';
import { CartContext } from '@/context/CartContext';
import { Trash2, ArrowLeft, CreditCard, Globe, Shield, Zap, Plus, Minus, Lock, Clock, RefreshCw } from 'lucide-react';
import { useCatalogContext } from './CatalogLayout';
import { useTranslation } from '@/hooks/useTranslation';

// Currency configuration
const CURRENCIES = [
    { value: 'USD', label: 'USD ($)', symbol: '$' },
    { value: 'CAD', label: 'CAD (CA$)', symbol: 'CA$' },
    { value: 'NGN', label: 'NGN (₦)', symbol: '₦' },
    { value: 'GHS', label: 'GHS (GH₵)', symbol: 'GH₵' },
    { value: 'KES', label: 'KES (KSh)', symbol: 'KSh' },
    { value: 'ZAR', label: 'ZAR (R)', symbol: 'R' },
    { value: 'GBP', label: 'GBP (£)', symbol: '£' },
    { value: 'EUR', label: 'EUR (€)', symbol: '€' },
    { value: 'RWF', label: 'RWF (RWF)', symbol: 'RWF' },
];

// Simple location to currency mapping
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    'NG': 'NGN', // Nigeria
    'GH': 'GHS', // Ghana
    'KE': 'KES', // Kenya
    'ZA': 'ZAR', // South Africa
    'RW': 'RWF', // Rwanda
    'CA': 'CAD', // Canada
    'GB': 'GBP', // United Kingdom
    'US': 'USD', // United States
    'DE': 'EUR', // Germany
    'FR': 'EUR', // France
    'ES': 'EUR', // Spain
    'IT': 'EUR', // Italy
};

const detectUserCurrency = async (): Promise<string> => {
    try {
        const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
            const data = await response.json();
            const countryCode = data.country_code;
            return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
        }
    } catch (error) {
        console.log('Location detection failed, defaulting to USD');
    }
    return 'USD';
};

const Checkout: React.FC = () => {
    const { org } = useCatalogContext();
    const translationStrings = useMemo(() => ([
        'Catalog not published',
        'This business hasn’t published a public catalog yet. Reach out directly if you need a quote or invoice.',
        'Contact',
        'Your cart is empty',
        'Add some services to get started.',
        'Browse Services',
        'Continue Shopping',
        'Checkout',
        'Order Summary',
        'each',
        'Subtotal',
        'Payment Currency',
        'Detecting your location...',
        'Currency detected based on your location. You can change it below.',
        'You will pay',
        'Secure Checkout',
        '256-bit SSL',
        '24/7 Support',
        'Always available',
        'Money Back',
        '30-day guarantee',
        'Customer Details',
        'Full Name',
        'Email Address',
        'Phone Number (Optional)',
        'Company Name (Optional)',
        'Special Instructions (Optional)',
        'Any special requirements or notes...',
        'Generate Invoice',
        'An invoice will be generated and emailed to you immediately.',
        'John Doe',
        'john@example.com',
        '+1 234 567 8900',
        'Acme Inc.',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const { cart, removeFromCart, clearCart, updateQuantity } = useContext(CartContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState('USD');
    const [detectingLocation, setDetectingLocation] = useState(true);
    const catalogEnabled = org.catalogEnabled !== false;

    useEffect(() => {
        if (!catalogEnabled) return;
        detectUserCurrency().then(currency => {
            setSelectedCurrency(currency);
            setDetectingLocation(false);
        });
    }, [catalogEnabled]);

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Currency conversion rates (simplified - in production use real API)
    const conversionRates: Record<string, number> = {
        'USD': 1,
        'CAD': 1.36,
        'NGN': 1550,
        'GHS': 12.5,
        'KES': 150,
        'ZAR': 18.5,
        'GBP': 0.79,
        'EUR': 0.92,
        'RWF': 1300,
    };

    const convertedTotal = total * conversionRates[selectedCurrency];
    const currencySymbol = CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || '$';

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return;

        setLoading(true);
        const invoice = await createInvoice({
            organizationId: org.id,
            clientName: formData.name,
            clientEmail: formData.email,
            clientCompany: formData.company,
            items: cart.map(c => ({
                id: crypto.randomUUID(),
                serviceId: c.id,
                description: c.name,
                quantity: c.quantity,
                unitPrice: c.price,
                total: c.price * c.quantity
            })),
            subtotal: total,
            taxRate: 0,
            taxAmount: 0,
            total: total,
            status: InvoiceStatus.DRAFT,
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            notes: formData.notes || undefined
        });

        clearCart();
        setLoading(false);
        navigate({ to: `../success/${invoice.id}` });
    };

    if (!catalogEnabled) {
        return (
            <div className="text-center py-20 space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t('Catalog not published')}</h2>
                <p className="text-muted max-w-md mx-auto">
                    {t('This business hasn’t published a public catalog yet. Reach out directly if you need a quote or invoice.')}
                </p>
                {org.contactEmail && (
                    <a
                        href={`mailto:${org.contactEmail}`}
                        className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors"
                    >
                        {t('Contact')} {org.name}
                    </a>
                )}
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="text-center py-20 space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t('Your cart is empty')}</h2>
                <p className="text-muted">{t('Add some services to get started.')}</p>
                <Button onClick={() => navigate({ to: '/catalog/$slug', params: { slug: org.slug } })}>
                    {t('Browse Services')}
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate({ to: '/catalog/$slug', params: { slug: org.slug } })}
                    className="flex items-center text-muted hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('Continue Shopping')}
                </button>
                <h1 className="text-2xl font-bold text-foreground">{t('Checkout')}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Cart Items - Left Column */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="p-6">
                        <h2 className="font-bold text-lg text-foreground mb-6 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" /> {t('Order Summary')}
                        </h2>
                        <div className="space-y-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0">
                                    <div className="flex gap-4 flex-1 items-center">
                                        {item.imageUrl && (
                                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-medium text-foreground">{item.name}</h4>
                                            <p className="text-sm text-muted">
                                                {formatCurrency(item.price, org.currency)} {t('each')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg">
                                            <button
                                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                className="p-2 text-muted hover:text-foreground transition-colors"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="p-2 text-muted hover:text-foreground transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <span className="font-bold text-foreground min-w-[80px] text-right">
                                            {formatCurrency(item.price * item.quantity, org.currency)}
                                        </span>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-muted hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Section */}
                        <div className="mt-6 pt-6 border-t border-border">
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-muted">{t('Subtotal')} ({org.currency})</span>
                                <span className="font-bold text-foreground">{formatCurrency(total, org.currency)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Currency Selector */}
                    <Card className="p-6">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" /> {t('Payment Currency')}
                        </h3>
                        <p className="text-sm text-muted mb-4">
                            {detectingLocation ? t('Detecting your location...') : t('Currency detected based on your location. You can change it below.')}
                        </p>
                        <Select
                            options={CURRENCIES}
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value)}
                        />
                        <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="flex justify-between items-center">
                                <span className="text-muted">{t('You will pay')}</span>
                                <span className="text-2xl font-bold text-primary">
                                    {currencySymbol}{convertedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center text-center p-4 bg-surface/50 rounded-xl border border-border">
                            <Lock className="w-6 h-6 text-green-500 mb-2" />
                            <span className="text-xs font-medium text-foreground">{t('Secure Checkout')}</span>
                            <span className="text-[10px] text-muted">{t('256-bit SSL')}</span>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-surface/50 rounded-xl border border-border">
                            <Clock className="w-6 h-6 text-primary mb-2" />
                            <span className="text-xs font-medium text-foreground">{t('24/7 Support')}</span>
                            <span className="text-[10px] text-muted">{t('Always available')}</span>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-surface/50 rounded-xl border border-border">
                            <RefreshCw className="w-6 h-6 text-secondary mb-2" />
                            <span className="text-xs font-medium text-foreground">{t('Money Back')}</span>
                            <span className="text-[10px] text-muted">{t('30-day guarantee')}</span>
                        </div>
                    </div>
                </div>

                {/* Customer Form - Right Column */}
                <div className="lg:col-span-2">
                    <Card className="p-6 sticky top-24 bg-surface/50 backdrop-blur-md border-border">
                        <h3 className="font-bold text-lg text-foreground mb-6 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" /> {t('Customer Details')}
                        </h3>
                        <form onSubmit={handleCheckout} className="space-y-5">
                            <Input
                                required
                                label={t('Full Name')}
                                placeholder={t('John Doe')}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <Input
                                required
                                type="email"
                                label={t('Email Address')}
                                placeholder={t('john@example.com')}
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            <Input
                                type="tel"
                                label={t('Phone Number (Optional)')}
                                placeholder={t('+1 234 567 8900')}
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                            <Input
                                label={t('Company Name (Optional)')}
                                placeholder={t('Acme Inc.')}
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                            />
                            <div>
                                <label className="text-sm font-medium mb-2 block text-foreground">
                                    {t('Special Instructions (Optional)')}
                                </label>
                                <textarea
                                    placeholder={t('Any special requirements or notes...')}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full h-20 resize-none rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                                />
                            </div>

                            <div className="pt-4 space-y-4">
                                <Button type="submit" className="w-full h-12 text-lg shadow-neon" isLoading={loading}>
                                    <Zap className="w-5 h-5 mr-2" /> {t('Generate Invoice')}
                                </Button>
                                <p className="text-xs text-center text-muted">
                                    {t('An invoice will be generated and emailed to you immediately.')}
                                </p>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
