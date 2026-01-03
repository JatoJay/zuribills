import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Invoice, Organization, InvoiceStatus } from '@/types';
import { getOrganizationBySlug, getInvoices } from '@/services/storage';
import { Button, formatCurrency, Badge, Card, Input } from '@/components/ui';
import { Printer, CreditCard, X, DollarSign, Shield, CheckCircle2, AlertCircle, Zap, RefreshCw, Smartphone } from 'lucide-react';
import { processPayment, PaymentGateway } from '@/services/paymentService';
import { useTranslation } from '@/hooks/useTranslation';
import { resolvePayoutProvider } from '@/services/paymentRouting';

// Payment gateway configurations
const PAYMENT_GATEWAYS: Record<string, any> = {
    momo: {
        name: 'MoMo',
        currencies: ['RWF', 'GHS', 'KES', 'ZAR'],
        icon: Smartphone,
        description: 'Pay with mobile money',
        color: 'bg-emerald-500',
    },
    flutterwave: {
        name: 'Flutterwave',
        currencies: ['USD', 'NGN', 'GBP', 'EUR', 'KES', 'GHS', 'ZAR', 'RWF'],
        icon: Zap,
        description: 'Pay with card, bank, or mobile money',
        color: 'bg-orange-500',
    },
    stripe: {
        name: 'Card',
        currencies: ['*'],
        icon: CreditCard,
        description: 'Pay with card or bank',
        color: 'bg-slate-900',
    },
};

const InvoiceView: React.FC = () => {
    const params = useParams({ strict: false });
    const slug = (params as any).slug;
    const invoiceId = (params as any).invoiceId;
    const translationStrings = useMemo(() => ([
        'Loading Invoice...',
        'Pay Now',
        'Paid',
        'Print Invoice',
        'Bill From',
        'INVOICE',
        'Bill To',
        'Date:',
        'Due Date:',
        'Description',
        'Qty',
        'Price',
        'Amount',
        'Subtotal',
        'Tax (0%)',
        'Total',
        'Notes & Terms',
        'Thank you for your business.',
        'Payment Successful!',
        'Payment Failed',
        'Pay Invoice',
        'Your invoice has been marked as paid.',
        'Payment failed. Please try again.',
        'Invoice:',
        'Select Payment Method:',
        'Close',
        'Try Again',
        'Secured with 256-bit SSL encryption',
        'Pay with credit/debit card',
        'Pay with card, bank transfer, or USSD',
        'Pay with card, bank, or mobile money',
        'Pay with card or bank',
        'Pay with mobile money',
        'Payments unavailable',
        'This business needs to connect a payout account before it can accept payments.',
        'Redirecting to Flutterwave...',
        'Payment received. Waiting for Flutterwave to confirm the transfer...',
        'Payment received. Updating invoice status...',
        'MoMo prompt sent. Please approve the payment on your phone.',
        'Waiting for MoMo confirmation...',
        'Mobile money number',
        'Enter your mobile money number to receive the payment prompt.',
        'Payment cancelled.',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [data, setData] = useState<{ invoice: Invoice, org: Organization } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'redirecting' | 'pending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
    const [paymentReturnStatus, setPaymentReturnStatus] = useState<'success' | 'failed' | null>(null);
    const [momoPhone, setMomoPhone] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!slug || !invoiceId) return;
            const org = await getOrganizationBySlug(slug);
            if (org) {
                const invoices = await getInvoices(org.id);
                const invoice = invoices.find(i => i.id === invoiceId);
                if (invoice) setData({ invoice, org });
            }
        };
        load();
    }, [slug, invoiceId]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        if (status === 'successful') {
            setPaymentNotice(t('Payment received. Updating invoice status...'));
            setPaymentReturnStatus('success');
        } else if (status === 'cancelled' || status === 'failed') {
            setPaymentNotice(t('Payment cancelled.'));
            setPaymentReturnStatus('failed');
        }
    }, [t]);

    useEffect(() => {
        if (!data || paymentReturnStatus !== 'success' || data.invoice.status === InvoiceStatus.PAID) {
            return;
        }

        let cancelled = false;
        let attempts = 0;

        const poll = async () => {
            if (cancelled) return;
            attempts += 1;
            try {
                const invoices = await getInvoices(data.org.id);
                const updatedInvoice = invoices.find(i => i.id === data.invoice.id);
                if (updatedInvoice) {
                    setData(prev => prev ? { ...prev, invoice: updatedInvoice } : prev);
                }
                if (updatedInvoice?.status === InvoiceStatus.PAID || attempts >= 6) {
                    return;
                }
            } catch (error) {
                console.error('Failed to refresh invoice status', error);
                return;
            }
            setTimeout(poll, 3000);
        };

        poll();

        return () => {
            cancelled = true;
        };
    }, [data, paymentReturnStatus]);

    // Determine available gateways based on currency
    const getAvailableGateways = (currency: string) => {
        return Object.entries(PAYMENT_GATEWAYS).filter(([_, gateway]) =>
            gateway.currencies.includes(currency) || gateway.currencies.includes('*')
        );
    };

    const handlePayment = async (gateway: string) => {
        if (!data) return;
        if (!paymentsEnabled) {
            setPaymentStatus('error');
            setErrorMessage(t('Payments unavailable'));
            return;
        }
        if (gateway === 'momo' && !momoPhone.trim()) {
            setPaymentStatus('error');
            setErrorMessage(t('Enter your mobile money number to receive the payment prompt.'));
            return;
        }
        setIsProcessing(true);
        setSelectedGateway(gateway);
        setErrorMessage('');
        setPaymentStatus(gateway === 'momo' ? 'pending' : 'redirecting');

        const result = await processPayment(gateway as PaymentGateway, {
            invoiceId: data.invoice.id,
            amount: data.invoice.total,
            currency: data.org.currency,
            customerEmail: data.invoice.clientEmail,
            customerName: data.invoice.clientName,
            description: `Payment for Invoice ${data.invoice.invoiceNumber}`,
            payerPhone: momoPhone.trim(),
        });

        if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
            return;
        }

        if (gateway === 'momo' && result.success && result.reference) {
            setPaymentNotice(t('MoMo prompt sent. Please approve the payment on your phone.'));
            let cancelled = false;
            let attempts = 0;

            const pollStatus = async () => {
                if (cancelled) return;
                attempts += 1;
                try {
                    const response = await fetch(`/api/payments/momo/status?reference=${encodeURIComponent(result.reference)}&invoiceId=${data.invoice.id}`);
                    const statusData = await response.json().catch(() => ({}));
                    if (statusData?.status === 'SUCCESSFUL') {
                        setPaymentStatus('success');
                        setPaymentNotice(t('Payment received. Updating invoice status...'));
                        try {
                            const invoices = await getInvoices(data.org.id);
                            const updatedInvoice = invoices.find(i => i.id === data.invoice.id);
                            if (updatedInvoice) {
                                setData(prev => prev ? { ...prev, invoice: updatedInvoice } : prev);
                            }
                        } catch (error) {
                            console.error('Failed to refresh invoice status', error);
                        }
                        setTimeout(() => {
                            setShowPaymentModal(false);
                            setPaymentStatus('idle');
                        }, 2500);
                        return;
                    }
                    if (statusData?.status && statusData.status !== 'PENDING') {
                        setPaymentStatus('error');
                        setErrorMessage(t('Payment failed. Please try again.'));
                        return;
                    }
                } catch (error) {
                    console.error('Failed to check MoMo status', error);
                    setPaymentStatus('error');
                    setErrorMessage(t('Payment failed. Please try again.'));
                    return;
                }

                if (attempts < 10) {
                    setTimeout(pollStatus, 4000);
                }
            };

            pollStatus();

            setIsProcessing(false);
            setSelectedGateway(null);
            return;
        }

        if (result.success) {
            setPaymentStatus('success');
            setTimeout(() => {
                setShowPaymentModal(false);
                setPaymentStatus('idle');
            }, 3000);
        } else {
            setPaymentStatus('error');
            setErrorMessage(result.error || t('Payment failed. Please try again.'));
        }

        setIsProcessing(false);
        setSelectedGateway(null);
    };

    if (!data) return <div className="p-8 text-center">{t('Loading Invoice...')}</div>;

    const { invoice, org } = data;
    const paymentConfig = org.paymentConfig;
    const paymentProvider = paymentConfig?.bankCountry
        ? resolvePayoutProvider(paymentConfig.bankCountry)
        : (paymentConfig?.provider || 'flutterwave');
    const paymentsEnabled = Boolean(
        paymentConfig?.enabled
        && (
            (paymentProvider === 'flutterwave' && paymentConfig?.accountId)
            || (paymentProvider === 'momo' && paymentConfig?.momoMsisdn)
            || (paymentProvider === 'stripe' && paymentConfig?.accountId)
        )
    );
    const availableGateways = paymentsEnabled
        ? getAvailableGateways(org.currency).filter(([key]) => key === paymentProvider)
        : [];
    const hasMomoGateway = availableGateways.some(([key]) => key === 'momo');
    const isPaid = invoice.status === InvoiceStatus.PAID;

    return (
        <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
            <div className="max-w-3xl mx-auto print:max-w-none">
                {paymentNotice && (
                    <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                        {paymentNotice}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mb-6 flex justify-between items-center print:hidden">
                    <div className="flex gap-3">
                        {!isPaid && paymentsEnabled && availableGateways.length > 0 && (
                            <Button onClick={() => setShowPaymentModal(true)} className="shadow-neon">
                                <CreditCard className="w-4 h-4 mr-2" /> {t('Pay Now')}
                            </Button>
                        )}
                        {!isPaid && !paymentsEnabled && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                                <span className="font-semibold">{t('Payments unavailable')}</span>
                                <span className="ml-2">{t('This business needs to connect a payout account before it can accept payments.')}</span>
                            </div>
                        )}
                        {isPaid && (
                            <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                                <Shield className="w-4 h-4 mr-2" /> {t('Paid')}
                            </span>
                        )}
                    </div>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> {t('Print Invoice')}
                    </Button>
                </div>

                <div className="bg-white p-12 shadow-sm rounded-lg print:shadow-none">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                        <div>
                            {org.logoUrl && <img src={org.logoUrl} alt="Logo" className="h-12 w-auto mb-4 object-contain" />}
                            <h1 className="text-2xl font-bold mb-1">{org.name}</h1>
                            <div className="text-slate-500 text-sm space-y-0.5">
                                <p>{org.contactEmail}</p>
                                {org.contactPhone && <p>{org.contactPhone}</p>}
                                {org.address && (
                                    <div className="mt-1">
                                        {org.address.street && <p>{org.address.street}</p>}
                                        {(org.address.city || org.address.state || org.address.zip) && (
                                            <p>
                                                {[org.address.city, org.address.state, org.address.zip]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                        )}
                                        {org.address.country && <p>{org.address.country}</p>}
                                    </div>
                                )}
                                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{t('Bill From')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-light text-slate-300 mb-2">{t('INVOICE')}</h2>
                            <p className="font-mono font-bold text-lg">{invoice.invoiceNumber}</p>
                            <div className="mt-2">
                                <Badge status={invoice.status} />
                            </div>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{t('Bill To')}</p>
                            <h3 className="font-bold">{invoice.clientName}</h3>
                            {invoice.clientCompany && <p className="text-slate-600">{invoice.clientCompany}</p>}
                            <p className="text-slate-500 text-sm">{invoice.clientEmail}</p>
                        </div>
                        <div className="text-right">
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">{t('Date:')}</span>
                                    <span className="font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">{t('Due Date:')}</span>
                                    <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <table className="w-full mb-12">
                        <thead>
                            <tr className="border-b border-black text-sm">
                                <th className="text-left py-2 font-bold">{t('Description')}</th>
                                <th className="text-right py-2 font-bold w-20">{t('Qty')}</th>
                                <th className="text-right py-2 font-bold w-32">{t('Price')}</th>
                                <th className="text-right py-2 font-bold w-32">{t('Amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {invoice.items.map(item => (
                                <tr key={item.id} className="border-b border-slate-100">
                                    <td className="py-4 text-slate-700">{item.description}</td>
                                    <td className="py-4 text-right text-slate-500">{item.quantity}</td>
                                    <td className="py-4 text-right text-slate-500">{formatCurrency(item.unitPrice, org.currency)}</td>
                                    <td className="py-4 text-right font-medium">{formatCurrency(item.total, org.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-slate-500">
                                <span>{t('Subtotal')}</span>
                                <span>{formatCurrency(invoice.subtotal, org.currency)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>{t('Tax (0%)')}</span>
                                <span>{formatCurrency(0, org.currency)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xl pt-4 border-t border-slate-200">
                                <span>{t('Total')}</span>
                                <span>{formatCurrency(invoice.total, org.currency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    {invoice.notes && (
                        <div className="mt-12 pt-6 border-t border-slate-100">
                            <h4 className="font-bold text-sm mb-2 text-slate-700">{t('Notes & Terms')}</h4>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-20 text-center text-xs text-slate-400">
                        <p>{t('Thank you for your business.')}</p>
                    </div>
                </div>
            </div>

            {/* Payment Gateway Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
                    <Card className="w-full max-w-md p-6 bg-white relative animate-fade-in-up">
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                {paymentStatus === 'success' ? (
                                    <CheckCircle2 className="w-8 h-8 text-green-500 animate-in zoom-in duration-300" />
                                ) : paymentStatus === 'redirecting' || paymentStatus === 'pending' ? (
                                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                                ) : paymentStatus === 'error' ? (
                                    <AlertCircle className="w-8 h-8 text-red-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <DollarSign className="w-8 h-8 text-primary" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold">
                                {paymentStatus === 'success' ? t('Payment Successful!') :
                                    paymentStatus === 'redirecting' ? t('Redirecting to Flutterwave...') :
                                        paymentStatus === 'pending' ? t('Waiting for MoMo confirmation...') :
                                        paymentStatus === 'error' ? t('Payment Failed') : t('Pay Invoice')}
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">
                                {paymentStatus === 'success' ? t('Your invoice has been marked as paid.') :
                                    paymentStatus === 'redirecting' ? `${t('Invoice:')} ${invoice.invoiceNumber}` :
                                        paymentStatus === 'pending' ? t('MoMo prompt sent. Please approve the payment on your phone.') :
                                        paymentStatus === 'error' ? errorMessage : `${t('Invoice:')} ${invoice.invoiceNumber}`}
                            </p>
                            {paymentStatus === 'idle' && (
                                <p className="text-2xl font-bold text-primary mt-2">
                                    {formatCurrency(invoice.total, org.currency)}
                                </p>
                            )}
                        </div>

                        {paymentStatus === 'idle' ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-slate-600 mb-2">{t('Select Payment Method:')}</p>

                                {hasMomoGateway && (
                                    <div className="mb-2">
                                        <Input
                                            label={t('Mobile money number')}
                                            value={momoPhone}
                                            inputMode="tel"
                                            onChange={(e) => setMomoPhone(e.target.value)}
                                            className="bg-slate-50"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            {t('Enter your mobile money number to receive the payment prompt.')}
                                        </p>
                                    </div>
                                )}

                                {availableGateways.map(([key, gateway]) => {
                                    const Icon = gateway.icon;
                                    const isSelected = selectedGateway === key;
                                    const isLoading = isProcessing && isSelected;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handlePayment(key)}
                                            disabled={isProcessing}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                                                } ${isProcessing && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`w-12 h-12 ${gateway.color} rounded-lg flex items-center justify-center text-white`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-bold">{gateway.name}</p>
                                                <p className="text-sm text-slate-500">{t(gateway.description)}</p>
                                            </div>
                                            {isLoading && (
                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : paymentStatus === 'redirecting' ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                                <div className="mx-auto mb-3 h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {t('Redirecting to Flutterwave...')}
                            </div>
                        ) : paymentStatus === 'pending' ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                                <div className="mx-auto mb-3 h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {t('Waiting for MoMo confirmation...')}
                            </div>
                        ) : paymentStatus === 'success' ? (
                            <div className="py-8 text-center">
                                <Button className="w-full" onClick={() => setShowPaymentModal(false)}>{t('Close')}</Button>
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <Button className="w-full" onClick={() => setPaymentStatus('idle')}>{t('Try Again')}</Button>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                            <Shield className="w-3 h-3" />
                            <span>{t('Secured with 256-bit SSL encryption')}</span>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default InvoiceView;
