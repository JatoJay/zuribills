import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { Invoice, Organization, InvoiceStatus, DEFAULT_EINVOICING_CONFIG } from '@/types';
import { getOrganizationBySlug, getInvoices } from '@/services/storage';
import { apiFetch } from '@/services/apiClient';
import { Button, formatCurrency, Badge, Card, Input } from '@/components/ui';
import { Printer, CreditCard, X, DollarSign, Shield, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ArrowRightLeft, Calendar } from 'lucide-react';
import { processPayment } from '@/services/paymentService';
import { useTranslation } from '@/hooks/useTranslation';
import { resolvePayoutProvider } from '@/services/paymentRouting';
import { QRCodeSVG } from 'qrcode.react';

const PAYMENT_PROVIDER_DETAILS = {
    name: 'Secure Payment',
    icon: CreditCard,
    description: 'Pay via Card, Bank or Mobile Money',
    color: 'bg-orange-500',
};

const generateInvoiceQRData = (invoice: Invoice, org: Organization): string => {
    const baseUrl = window.location.origin;
    const invoiceUrl = `${baseUrl}/catalog/${org.slug}/invoice/${invoice.id}`;
    return invoiceUrl;
};

const PENDING_PAYMENT_KEY = 'invoiceflow_pending_payment';

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
        'VAT',
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
        'Processed securely',
        'Payments unavailable',
        'This business needs to connect a payout account before it can accept payments.',
        'Redirecting to secure checkout...',
        'Payment received. Updating invoice status...',
        'Payment prompt sent. Please approve on your phone.',
        'Waiting for payment confirmation...',
        'Mobile money number',
        'Enter your mobile money number to receive the payment prompt.',
        'Payment cancelled.',
        'Transferred from',
        'Original Owner',
        'Transfer Date',
        'Transfer Reason',
        'TIN:',
        'Scan to verify',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [data, setData] = useState<{ invoice: Invoice, org: Organization } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'redirecting' | 'pending' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
    const [paymentReturnStatus, setPaymentReturnStatus] = useState<'success' | 'failed' | null>(null);
    const [momoPhone, setMomoPhone] = useState('');
    const [momoNetwork, setMomoNetwork] = useState('');
    const resumedPendingRef = useRef(false);

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

    const clearPendingPayment = () => {
        localStorage.removeItem(PENDING_PAYMENT_KEY);
    };

    const persistPendingPayment = (reference: string, provider: string) => {
        if (!data) return;
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
            invoiceId: data.invoice.id,
            reference,
            provider,
        }));
    };

    const pollPaymentStatus = (reference: string, provider: string) => {
        if (!data) return () => {};
        let cancelled = false;
        let attempts = 0;

        const pollStatus = async () => {
            if (cancelled) return;
            attempts += 1;
            try {
                const response = await apiFetch(`/api/payments/${provider}/status?reference=${reference}&invoiceId=${data.invoice.id}`, {
                    method: 'GET',
                });
                const statusData = await response.json().catch(() => ({}));
                const normalizedStatus = String(statusData?.status || '').toUpperCase();
                if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'SUCCESSFUL') {
                    setPaymentStatus('success');
                    setPaymentNotice(t('Payment received. Updating invoice status...'));
                    clearPendingPayment();
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
                if (normalizedStatus && normalizedStatus !== 'PENDING') {
                    setPaymentStatus('error');
                    setErrorMessage(t('Payment failed. Please try again.'));
                    clearPendingPayment();
                    return;
                }
            } catch (error) {
                console.error('Failed to check payment status', error);
            }

            if (attempts < 10) {
                setTimeout(pollStatus, 4000);
            }
        };

        pollStatus();

        return () => {
            cancelled = true;
        };
    };

    useEffect(() => {
        if (!data || resumedPendingRef.current || data.invoice.status === InvoiceStatus.PAID) {
            return;
        }
        const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
        if (!raw) return;
        try {
            const pending = JSON.parse(raw);
            if (pending?.invoiceId !== data.invoice.id || !pending?.reference || !pending?.provider) {
                return;
            }
            resumedPendingRef.current = true;
            setPaymentStatus('pending');
            setPaymentNotice(t('Waiting for payment confirmation...'));
            pollPaymentStatus(pending.reference, pending.provider);
        } catch (error) {
            console.error('Failed to resume pending payment', error);
        }
    }, [data, t]);

    const handlePayment = async (requiresPhone: boolean) => {
        if (!data) return;
        if (!paymentsEnabled) {
            setPaymentStatus('error');
            setErrorMessage(t('Payments unavailable'));
            return;
        }
        if (requiresPhone && !momoPhone.trim()) {
            setPaymentStatus('error');
            setErrorMessage(t('Enter your mobile money number to receive the payment prompt.'));
            return;
        }
        setIsProcessing(true);
        setErrorMessage('');
        setPaymentStatus('redirecting');

        const countryCode = data.org.paymentConfig?.bankCountry || data.org.address?.country;
        const result = await processPayment({
            invoiceId: data.invoice.id,
            amount: data.invoice.total,
            currency: data.org.currency,
            customerEmail: data.invoice.clientEmail,
            customerName: data.invoice.clientName,
            customerPhone: momoPhone.trim(),
            description: `Payment for Invoice ${data.invoice.invoiceNumber}`,
            countryCode,
            orgSlug: slug,
            organizationId: data.org.id,
        });

        if (result.reference) {
            persistPendingPayment(result.reference, result.provider || 'polar');
        }

        if (result.redirectUrl && !requiresPhone) {
            window.location.href = result.redirectUrl;
            return;
        }

        if (result.success && result.reference && requiresPhone) {
            setPaymentStatus('pending');
            setPaymentNotice(t('Payment prompt sent. Please approve on your phone.'));
            pollPaymentStatus(result.reference, result.provider || 'polar');
            setIsProcessing(false);
            return;
        }

        if (result.success) {
            setPaymentStatus('success');
            clearPendingPayment();
            setTimeout(() => {
                setShowPaymentModal(false);
                setPaymentStatus('idle');
            }, 3000);
        } else {
            setPaymentStatus('error');
            setErrorMessage(result.error || t('Payment failed. Please try again.'));
        }

        setIsProcessing(false);
    };

    const networks = useMemo(() => {
        if (!data?.org?.currency) return [];
        if (data.org.currency === 'RWF') return [{ label: 'MTN', value: 'MTN' }, { label: 'Airtel', value: 'AIRTEL' }];
        if (data.org.currency === 'GHS') return [{ label: 'MTN', value: 'MTN' }, { label: 'Vodafone', value: 'VODAFONE' }, { label: 'AirtelTigo', value: 'AIRTEL' }];
        return [];
    }, [data?.org?.currency]);

    useEffect(() => {
        if (networks.length > 0 && !momoNetwork) {
            setMomoNetwork(networks[0].value);
        }
    }, [networks, momoNetwork]);

    if (!data) return <div className="p-8 text-center text-foreground">{t('Loading Invoice...')}</div>;

    const { invoice, org } = data;
    const paymentConfig = org.paymentConfig;
    const _paymentProvider = paymentConfig?.bankCountry
        ? resolvePayoutProvider(paymentConfig.bankCountry)
        : (paymentConfig?.provider || 'polar');
    void _paymentProvider;
    const paymentsEnabled = Boolean(
        paymentConfig?.enabled
        && (
            paymentConfig?.accountId
            || paymentConfig?.mobileNumber
            || (paymentConfig?.bankName && paymentConfig?.accountName)
        )
    );
    const requiresPhone = false;
    const isPaid = invoice.status === InvoiceStatus.PAID;
    const vatRate = Number.isFinite(invoice.taxRate) ? Math.max(0, invoice.taxRate) : 0;
    const vatAmount = Number.isFinite(invoice.taxAmount) ? invoice.taxAmount : 0;
    const vatLabel = `${t('VAT')} (${vatRate}%)`;
    const PaymentIcon = PAYMENT_PROVIDER_DETAILS.icon;

    return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-8 dark:bg-background transition-colors duration-300 print:p-0 print:bg-white print:min-h-0 flex justify-center">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    html, body {
                        height: auto !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    * {
                        overflow: visible !important;
                    }
                    .print-page-break {
                        page-break-inside: avoid;
                    }
                    .print-break-before {
                        page-break-before: auto;
                    }
                }
            `}</style>
            <div className="w-full max-w-5xl print:max-w-none print:w-full">
                {paymentNotice && (
                    <div className="mb-4 rounded-lg border border-slate-200 bg-surface px-4 py-3 text-sm text-foreground shadow-sm animate-in slide-in-from-top duration-300">
                        {paymentNotice}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                    <div className="flex flex-wrap gap-3">
                        {!isPaid && paymentsEnabled && (
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

                <div className="bg-white p-6 sm:p-12 shadow-sm rounded-lg print:shadow-none print:p-8 text-slate-900">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                        <div>
                            {org.logoUrl && <img src={org.logoUrl} alt="Logo" className="h-12 w-auto mb-4 object-contain" />}
                            <h1 className="text-2xl font-bold mb-1 text-slate-900">{org.name}</h1>
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
                                {org.taxId && (org.eInvoicingConfig?.showSellerTin ?? DEFAULT_EINVOICING_CONFIG.showSellerTin) && (
                                    <p className="mt-1">{t('TIN:')} {org.taxId}</p>
                                )}
                                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{t('Bill From')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-light text-slate-300 mb-2">{t('INVOICE')}</h2>
                            <p className="font-mono font-bold text-lg text-slate-900">{invoice.invoiceNumber}</p>
                            <div className="mt-2">
                                <Badge status={invoice.status} />
                            </div>
                            {(org.eInvoicingConfig?.includeQrCode ?? DEFAULT_EINVOICING_CONFIG.includeQrCode) && (
                                <>
                                    <div className="mt-4 flex justify-end">
                                        <div className="p-2 bg-white border border-slate-200 rounded-lg">
                                            <QRCodeSVG
                                                value={generateInvoiceQRData(invoice, org)}
                                                size={80}
                                                level="M"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{t('Scan to verify')}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Ownership Transfer Banner */}
                    {invoice.ownershipTransfer && (
                        <div className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 print:bg-primary/10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <ArrowRightLeft className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-primary font-semibold uppercase tracking-wide">{t('Previously owned by')}</p>
                                    <p className="text-sm font-bold text-slate-900">{invoice.ownershipTransfer.previousClientName}</p>
                                    <p className="text-xs text-slate-600">{invoice.ownershipTransfer.previousClientEmail}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    <span>{t('Transfer Date')}: {new Date(invoice.ownershipTransfer.transferredAt).toLocaleDateString()}</span>
                                </div>
                                {invoice.ownershipTransfer.reason && (
                                    <div className="text-slate-600 italic">
                                        "{invoice.ownershipTransfer.reason}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{t('Bill To')}</p>
                            <h3 className="font-bold text-slate-900">{invoice.clientName}</h3>
                            {invoice.clientCompany && <p className="text-slate-600">{invoice.clientCompany}</p>}
                            <p className="text-slate-500 text-sm">{invoice.clientEmail}</p>
                            {invoice.clientTin && <p className="text-slate-500 text-sm mt-1">{t('TIN:')} {invoice.clientTin}</p>}
                        </div>
                        <div className="text-right text-slate-900">
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
                    <div className="overflow-x-auto -mx-12 px-12 md:mx-0 md:px-0 custom-scrollbar">
                        <table className="w-full mb-12 min-w-[600px]">
                        <thead>
                            <tr className="border-b border-slate-900 text-sm text-slate-900">
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
                                    <td className="py-4 text-right font-medium text-slate-900">{formatCurrency(item.total, org.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                    {/* Totals */}
                    <div className="flex justify-end text-slate-900">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-slate-500">
                                <span>{t('Subtotal')}</span>
                                <span>{formatCurrency(invoice.subtotal, org.currency)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>{vatLabel}</span>
                                <span>{formatCurrency(vatAmount, org.currency)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xl pt-4 border-t border-slate-200 text-slate-900">
                                <span>{t('Total')}</span>
                                <span>{formatCurrency(invoice.total, org.currency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    {invoice.notes && (
                        <div className="mt-12 pt-6 border-t border-slate-100 print-break-before">
                            <h4 className="font-bold text-sm mb-2 text-slate-700 print-page-break">{t('Notes & Terms')}</h4>
                            <div className="text-slate-600 text-sm whitespace-pre-wrap">{invoice.notes}</div>
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
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:hidden" onClick={() => setShowPaymentModal(false)}>
                    <Card className="w-full max-w-md p-6 bg-surface relative animate-fade-in-up shadow-2xl border-border" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                {paymentStatus === 'success' ? (
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in duration-300" />
                                ) : paymentStatus === 'redirecting' || paymentStatus === 'pending' ? (
                                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                                ) : paymentStatus === 'error' ? (
                                    <AlertCircle className="w-8 h-8 text-red-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <DollarSign className="w-8 h-8 text-primary" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-foreground">
                                {paymentStatus === 'success' ? t('Payment Successful!') :
                                    paymentStatus === 'redirecting' ? t('Redirecting to secure checkout...') :
                                        paymentStatus === 'pending' ? t('Waiting for payment confirmation...') :
                                        paymentStatus === 'error' ? t('Payment Failed') : t('Pay Invoice')}
                            </h3>
                            <p className="text-muted text-sm mt-1">
                                {paymentStatus === 'success' ? t('Your invoice has been marked as paid.') :
                                    paymentStatus === 'redirecting' ? `${t('Invoice:')} ${invoice.invoiceNumber}` :
                                        paymentStatus === 'pending' ? t('Payment prompt sent. Please approve on your phone.') :
                                        paymentStatus === 'error' ? errorMessage : `${t('Invoice:')} ${invoice.invoiceNumber}`}
                            </p>
                            {paymentStatus === 'idle' && (
                                <p className="text-3xl font-display font-bold text-primary mt-4">
                                    {formatCurrency(invoice.total, org.currency)}
                                </p>
                            )}
                        </div>

                        {paymentStatus === 'idle' ? (
                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-foreground uppercase tracking-wider opacity-70">{t('Select Payment Method:')}</p>

                                {requiresPhone && (
                                    <div className="space-y-4 mb-4">
                                        <Input
                                            label={t('Mobile money number')}
                                            value={momoPhone}
                                            inputMode="tel"
                                            placeholder="7XXXXXXXX"
                                            onChange={(e) => setMomoPhone(e.target.value)}
                                            className="bg-surface border-2 border-border focus:border-primary focus:ring-primary/20"
                                        />
                                        {networks.length > 0 && (
                                            <div>
                                                <label className="text-sm font-medium mb-2 block text-foreground">{t('Network')}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {networks.map(n => (
                                                        <button
                                                            key={n.value}
                                                            onClick={() => setMomoNetwork(n.value)}
                                                            className={`py-2 px-4 rounded-xl border-2 transition-all text-sm font-bold ${momoNetwork === n.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:border-border-hover'}`}
                                                        >
                                                            {n.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-muted mt-1.5 leading-tight">
                                            {t('Enter your mobile money number to receive the payment prompt.')}
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => handlePayment(requiresPhone)}
                                    disabled={isProcessing}
                                    className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${isProcessing
                                        ? 'border-primary bg-primary/5 cursor-wait'
                                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                        }`}
                                >
                                    <div className={`w-12 h-12 ${PAYMENT_PROVIDER_DETAILS.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                                        <PaymentIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-foreground">{PAYMENT_PROVIDER_DETAILS.name}</p>
                                        <p className="text-xs text-muted leading-relaxed">{t(PAYMENT_PROVIDER_DETAILS.description)}</p>
                                    </div>
                                    {isProcessing ? (
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center border border-border group-hover:bg-primary group-hover:text-background transition-colors">
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        ) : paymentStatus === 'redirecting' ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                                <div className="mx-auto mb-3 h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {t('Redirecting to secure checkout...')}
                            </div>
                        ) : paymentStatus === 'pending' ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                                <div className="mx-auto mb-3 h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {t('Waiting for payment confirmation...')}
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
