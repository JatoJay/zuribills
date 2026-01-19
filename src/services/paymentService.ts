/**
 * Payment Gateway Service
 * Uses Afnex for unified payment initialization.
 */

import { getSupabaseClient } from './supabaseClient';
import { apiFetch } from './apiClient';

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
    referenceType?: 'id' | 'tx_ref';
    txRef?: string;
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

export type PaymentGateway = 'flutterwave';

export const resolveAfnexProvider = (_currency: string): PaymentGateway => {
    return 'flutterwave';
};

export const requiresAfnexPhone = (currency: string) => {
    const normalized = String(currency || '').trim().toUpperCase();
    return ['RWF', 'GHS', 'KES', 'ZAR'].includes(normalized);
};

const getAccessToken = async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
};

// ============================================
// AFNEX INTEGRATION
// ============================================

export const initAfnexPayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    try {
        const currency = String(config.currency || '').toUpperCase();
        
        // Resolve provider based on currency for Afnex
        let provider = 'flutterwave';
        if (currency === 'NGN') provider = 'paystack';
        // Removed explicit overrides for MoMo to default to Flutterwave via Afnex


        const response = await apiFetch('/api/payments/afnex/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invoiceId: config.invoiceId,
                provider: provider,
                payerPhone: config.payerPhone,
                customerEmail: config.customerEmail,
                customerName: config.customerName,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to initialize payment.' };
        }

        const data = await response.json();
        return {
            success: true,
            reference: data.reference,
            redirectUrl: data.paymentUrl || data.payment_url || data.link,
        };
    } catch (error: any) {
        console.error('Afnex payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize payment.' };
    }
};

// ============================================
// FLUTTERWAVE PAYOUT HELPERS
// ============================================

export const fetchFlutterwaveBanks = async (country: string): Promise<FlutterwaveBank[]> => {
    try {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('Authentication required.');
        }

        const response = await apiFetch(`/api/payments/flutterwave/banks?country=${encodeURIComponent(country)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Failed to load banks.');
        }

        const data = await response.json();
        return Array.isArray(data?.banks) ? data.banks : [];
    } catch (error) {
        console.error('Flutterwave bank list error', error);
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

        const response = await apiFetch('/api/payments/flutterwave/payouts', {
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

export const processPayment = async (
    _gateway: PaymentGateway,
    config: PaymentConfig
): Promise<PaymentResult> => initAfnexPayment(config);

export const getRecommendedGateway = (currency: string): PaymentGateway => resolveAfnexProvider(currency);

export const isGatewayConfigured = (_gateway: PaymentGateway): boolean => true;

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
    const response = await apiFetch(`/api/payments/rates?${query.toString()}`);
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
