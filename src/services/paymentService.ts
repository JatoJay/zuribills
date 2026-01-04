/**
 * Payment Gateway Service
 * Handles Stripe, Flutterwave, and MTN MoMo integrations
 */

import { getSupabaseClient } from './supabaseClient';

// Environment variables for API keys
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
const FLUTTERWAVE_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '';

// Types
export interface PaymentConfig {
    invoiceId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    description: string;
    metadata?: Record<string, string>;
    payerPhone?: string;
    payerNetwork?: string;
}

export interface PaymentResult {
    success: boolean;
    reference?: string;
    redirectUrl?: string;
    error?: string;
}

export interface FlutterwaveBank {
    code: string;
    name: string;
}

export interface FlutterwavePayoutPayload {
    orgId: string;
    bankCode: string;
    bankName?: string;
    accountNumber: string;
    accountName: string;
    bankCountry: string;
}

export interface FlutterwavePayoutResult {
    success: boolean;
    accountId?: string;
    bankName?: string;
    bankCode?: string;
    bankCountry?: string;
    accountName?: string;
    accountNumberLast4?: string;
    error?: string;
}

export interface ProviderRateResult {
    rate: number;
    source?: string;
}

const getAccessToken = async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
};

// ============================================
// STRIPE INTEGRATION
// ============================================

/**
 * Initialize Stripe payment
 * In production, this would create a Checkout Session via your backend
 */
export const initStripePayment = async (config: PaymentConfig): Promise<PaymentResult> => {
    if (!STRIPE_PUBLIC_KEY) {
        console.warn('Stripe public key not configured. Add VITE_STRIPE_PUBLIC_KEY to .env');
        return { success: false, error: 'Stripe not configured' };
    }

    try {
        // Load Stripe.js if not already loaded
        const stripe = await loadStripe();
        if (!stripe) {
            return { success: false, error: 'Failed to load Stripe' };
        }

        // In production, you would:
        // 1. Call your backend to create a Checkout Session
        // 2. Redirect to Stripe Checkout using the session ID

        // Example backend call:
        // const response = await fetch('/api/create-checkout-session', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         invoiceId: config.invoiceId,
        //         amount: config.amount,
        //         currency: config.currency.toLowerCase(),
        //         customerEmail: config.customerEmail,
        //         successUrl: `${window.location.origin}/payment/success`,
        //         cancelUrl: `${window.location.origin}/payment/cancel`,
        //     }),
        // });
        // const { sessionId } = await response.json();
        // await stripe.redirectToCheckout({ sessionId });

        // For demo, log the config and simulate success
        console.log('Stripe Payment Config:', config);

        return {
            success: true,
            reference: `stripe_${Date.now()}`,
        };
    } catch (error: any) {
        console.error('Stripe payment error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Load Stripe.js dynamically
 */
let stripePromise: Promise<any> | null = null;

const loadStripe = async () => {
    if (!stripePromise) {
        stripePromise = new Promise((resolve) => {
            if ((window as any).Stripe) {
                resolve((window as any).Stripe(STRIPE_PUBLIC_KEY));
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                resolve((window as any).Stripe(STRIPE_PUBLIC_KEY));
            };
            script.onerror = () => {
                resolve(null);
            };
            document.head.appendChild(script);
        });
    }
    return stripePromise;
};

// ============================================
// PAYSTACK INTEGRATION
// ============================================

/**
 * Initialize Paystack payment
 * Opens Paystack popup for NGN payments
 */
export const initPaystackPayment = async (config: PaymentConfig): Promise<PaymentResult> => {
    if (!PAYSTACK_PUBLIC_KEY) {
        console.warn('Paystack public key not configured. Add VITE_PAYSTACK_PUBLIC_KEY to .env');
        return { success: false, error: 'Paystack not configured' };
    }

    return new Promise((resolve) => {
        // Load Paystack script if not already loaded
        loadPaystack().then((PaystackPop) => {
            if (!PaystackPop) {
                resolve({ success: false, error: 'Failed to load Paystack' });
                return;
            }

            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: config.customerEmail,
                amount: config.amount * 100, // Paystack expects amount in kobo
                currency: 'NGN',
                ref: `inv_${config.invoiceId}_${Date.now()}`,
                metadata: {
                    invoiceId: config.invoiceId,
                    customerName: config.customerName,
                    ...config.metadata,
                },
                onClose: () => {
                    resolve({ success: false, error: 'Payment cancelled' });
                },
                callback: (response: any) => {
                    // Payment successful
                    console.log('Paystack success:', response);
                    resolve({
                        success: true,
                        reference: response.reference,
                    });
                },
            });

            handler.openIframe();
        });
    });
};

/**
 * Load Paystack script dynamically
 */
let paystackPromise: Promise<any> | null = null;

const loadPaystack = async () => {
    if (!paystackPromise) {
        paystackPromise = new Promise((resolve) => {
            if ((window as any).PaystackPop) {
                resolve((window as any).PaystackPop);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v1/inline.js';
            script.onload = () => {
                resolve((window as any).PaystackPop);
            };
            script.onerror = () => {
                resolve(null);
            };
            document.head.appendChild(script);
        });
    }
    return paystackPromise;
};

// ============================================
// FLUTTERWAVE INTEGRATION
// ============================================

/**
 * Initialize Flutterwave payment
 * Requests a server-generated payment link and redirects
 */
export const initFlutterwavePayment = async (config: PaymentConfig): Promise<PaymentResult> => {
    if (!FLUTTERWAVE_PUBLIC_KEY) {
        console.warn('Flutterwave public key not configured. Add VITE_FLUTTERWAVE_PUBLIC_KEY to .env');
        return { success: false, error: 'Flutterwave not configured' };
    }

    try {
        const response = await fetch('/api/payments/flutterwave/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invoiceId: config.invoiceId,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to initialize payment.' };
        }

        const data = await response.json();
        if (!data?.link) {
            return { success: false, error: 'Missing payment link.' };
        }

        return {
            success: true,
            reference: data.reference,
            redirectUrl: data.link,
        };
    } catch (error: any) {
        console.error('Flutterwave payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize payment.' };
    }
};

// ============================================
// MTN MOMO INTEGRATION
// ============================================

export const initMomoPayment = async (config: PaymentConfig): Promise<PaymentResult> => {
    if (!config.payerPhone) {
        return { success: false, error: 'Mobile money number is required.' };
    }

    try {
        const response = await fetch('/api/payments/momo/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invoiceId: config.invoiceId,
                payerPhone: config.payerPhone,
                payerNetwork: config.payerNetwork,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to initialize MoMo payment.' };
        }

        const data = await response.json();
        if (data?.link) {
            return { success: true, redirectUrl: data.link, reference: data.reference };
        }
        if (!data?.reference) {
            return { success: false, error: 'Missing MoMo reference.' };
        }

        return {
            success: true,
            reference: data.reference,
        };
    } catch (error: any) {
        console.error('MoMo payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize MoMo payment.' };
    }
};

export const fetchFlutterwaveBanks = async (country: string): Promise<FlutterwaveBank[]> => {
    try {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('Authentication required.');
        }

        const response = await fetch(`/api/payments/flutterwave/banks?country=${encodeURIComponent(country)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Failed to load banks.');
        }

        const data = await response.json();
        return Array.isArray(data?.banks) ? data.banks : [];
    } catch (error) {
        console.error('Flutterwave bank list error:', error);
        return [];
    }
};

export const createFlutterwavePayoutAccount = async (
    payload: FlutterwavePayoutPayload
): Promise<FlutterwavePayoutResult> => {
    try {
        const token = await getAccessToken();
        if (!token) {
            return { success: false, error: 'Authentication required.' };
        }

        const response = await fetch('/api/payments/flutterwave/payouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to connect payout account.' };
        }

        const data = await response.json();
        return {
            success: true,
            accountId: data.accountId,
            bankName: data.bankName,
            bankCode: data.bankCode,
            bankCountry: data.bankCountry,
            accountName: data.accountName,
            accountNumberLast4: data.accountNumberLast4,
        };
    } catch (error: any) {
        console.error('Flutterwave payout account error:', error);
        return { success: false, error: error.message || 'Failed to connect payout account.' };
    }
};

// ============================================
// UNIFIED PAYMENT HANDLER
// ============================================

export type PaymentGateway = 'stripe' | 'paystack' | 'flutterwave' | 'momo';

/**
 * Process payment through the appropriate gateway
 */
export const processPayment = async (
    gateway: PaymentGateway,
    config: PaymentConfig
): Promise<PaymentResult> => {
    switch (gateway) {
        case 'stripe':
            return initStripePayment(config);
        case 'paystack':
            return initPaystackPayment(config);
        case 'flutterwave':
            return initFlutterwavePayment(config);
        case 'momo':
            return initMomoPayment(config);
        default:
            return { success: false, error: 'Unknown payment gateway' };
    }
};

/**
 * Get recommended gateway based on currency
 */
export const getRecommendedGateway = (currency: string): PaymentGateway => {
    const currencyUpper = currency.toUpperCase();
    if (currencyUpper === 'NGN') {
        return 'flutterwave';
    }
    if (['RWF', 'KES', 'GHS', 'ZAR'].includes(currencyUpper)) {
        return 'momo';
    }
    return 'stripe';
};

/**
 * Check if a gateway is configured
 */
export const isGatewayConfigured = (gateway: PaymentGateway): boolean => {
    switch (gateway) {
        case 'stripe':
            return !!STRIPE_PUBLIC_KEY;
        case 'paystack':
            return !!PAYSTACK_PUBLIC_KEY;
        case 'flutterwave':
            return !!FLUTTERWAVE_PUBLIC_KEY;
        case 'momo':
            return true;
        default:
            return false;
    }
};

export const fetchProviderRate = async (
    from: string,
    to: string,
    provider?: string,
    amount = 1
): Promise<ProviderRateResult> => {
    const query = new URLSearchParams({
        from,
        to,
        amount: String(amount),
    });
    if (provider) {
        query.set('provider', provider);
    }
    const response = await fetch(`/api/payments/rates?${query.toString()}`);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to load exchange rates.');
    }
    const data = await response.json().catch(() => ({}));
    if (!Number.isFinite(data?.rate)) {
        throw new Error('Invalid exchange rate response.');
    }
    return { rate: data.rate, source: data.source };
};
