/**
 * Payment Gateway Service
 * Uses Paystack for African payments and Stripe for international payments.
 */

import { getSupabaseClient } from './supabaseClient';
import { apiFetch } from './apiClient';
import { isPaystackRegion } from './paymentRouting';

export interface PaymentConfig {
    invoiceId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    description: string;
    metadata?: Record<string, string>;
    countryCode?: string;
}

export interface PaymentResult {
    success: boolean;
    reference?: string;
    redirectUrl?: string;
    error?: string;
    provider?: 'paystack' | 'stripe';
}

export interface BankInfo {
    code: string;
    name: string;
}

export interface PayoutAccountPayload {
    orgId: string;
    provider: 'paystack' | 'stripe';
    bankCode?: string;
    bankName?: string;
    accountNumber: string;
    accountName: string;
    bankCountry: string;
    mobileNetwork?: string;
    mobileNumber?: string;
}

export interface PayoutAccountResult {
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

export type PaymentGateway = 'paystack' | 'stripe';

const getAccessToken = async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
};

export const initPaystackPayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    try {
        const response = await apiFetch('/api/payments/paystack/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invoiceId: config.invoiceId,
                amount: config.amount,
                currency: config.currency,
                email: config.customerEmail,
                name: config.customerName,
                phone: config.customerPhone,
                description: config.description,
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
            redirectUrl: data.authorization_url,
            provider: 'paystack',
        };
    } catch (error: any) {
        console.error('Paystack payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize payment.' };
    }
};

export const initStripePayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    try {
        const response = await apiFetch('/api/payments/stripe/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                invoiceId: config.invoiceId,
                amount: config.amount,
                currency: config.currency,
                email: config.customerEmail,
                name: config.customerName,
                description: config.description,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to initialize payment.' };
        }

        const data = await response.json();
        return {
            success: true,
            reference: data.reference || data.session_id,
            redirectUrl: data.url || data.checkout_url,
            provider: 'stripe',
        };
    } catch (error: any) {
        console.error('Stripe payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize payment.' };
    }
};

export const fetchBanks = async (country: string, provider: PaymentGateway): Promise<BankInfo[]> => {
    try {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('Authentication required.');
        }

        const response = await apiFetch(
            `/api/payments/${provider}/banks?country=${encodeURIComponent(country)}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Failed to load banks.');
        }

        const data = await response.json();
        return Array.isArray(data?.banks) ? data.banks : [];
    } catch (error) {
        console.error(`${provider} bank list error`, error);
        return [];
    }
};

export const createPayoutAccount = async (
    payload: PayoutAccountPayload
): Promise<PayoutAccountResult> => {
    try {
        const token = await getAccessToken();
        if (!token) {
            return { success: false, error: 'Authentication required.' };
        }

        const response = await apiFetch(`/api/payments/${payload.provider}/payouts`, {
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
        console.error('Payout account error:', error);
        return { success: false, error: error.message || 'Failed to connect payout account.' };
    }
};

export const processPayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    const provider = getRecommendedGateway(config.countryCode);
    if (provider === 'paystack') {
        return initPaystackPayment(config);
    }
    return initStripePayment(config);
};

export const getRecommendedGateway = (countryCode?: string): PaymentGateway => {
    if (isPaystackRegion(countryCode)) {
        return 'paystack';
    }
    return 'stripe';
};

export const getAvailableGateways = (countryCode?: string): PaymentGateway[] => {
    if (isPaystackRegion(countryCode)) {
        return ['paystack'];
    }
    return ['stripe'];
};

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
