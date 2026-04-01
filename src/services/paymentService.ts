/**
 * Payment Gateway Service
 * Uses Flutterwave for African countries, Polar for US/International.
 */

import { getSupabaseClient } from './supabaseClient';
import { apiFetch } from './apiClient';
import { resolvePayoutProvider, isFlutterwaveSupported } from './paymentRouting';

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
    orgSlug?: string;
    organizationId?: string;
}

export interface PaymentResult {
    success: boolean;
    reference?: string;
    redirectUrl?: string;
    checkoutId?: string;
    error?: string;
    provider?: 'polar' | 'flutterwave';
}

export interface BankInfo {
    code: string;
    name: string;
}

export interface PayoutAccountPayload {
    orgId: string;
    provider: 'polar' | 'flutterwave';
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

export type PaymentGateway = 'polar' | 'flutterwave';

const getAccessToken = async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
};

const hexEncode = (payload: object): string => {
    const jsonStr = JSON.stringify(payload);
    return Array.from(new TextEncoder().encode(jsonStr))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

export const initPolarPayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    try {
        const payload = {
            i: config.invoiceId,
            a: config.amount,
            c: config.currency,
            z: config.customerEmail,
            n: config.customerName,
            d: config.description,
            o: config.orgSlug,
            oid: config.organizationId,
        };
        const hexEncoded = hexEncode(payload);

        const response = await fetch(`/api/checkout/init`, {
            method: 'GET',
            headers: {
                'X-Data': hexEncoded,
            },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to initialize payment.' };
        }

        const data = await response.json();
        return {
            success: true,
            reference: data.reference,
            redirectUrl: data.checkout_url,
            checkoutId: data.checkout_id,
            provider: 'polar',
        };
    } catch (error: any) {
        console.error('Polar payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize payment.' };
    }
};

export const initFlutterwavePayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    try {
        const payload = {
            i: config.invoiceId,
            a: config.amount,
            c: config.currency,
            z: config.customerEmail,
            n: config.customerName,
            d: config.description,
            o: config.orgSlug,
        };
        const hexEncoded = hexEncode(payload);

        const response = await fetch(`/api/payments/flutterwave/init`, {
            method: 'GET',
            headers: {
                'X-Data': hexEncoded,
            },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            return { success: false, error: errorBody.error || 'Failed to initialize payment.' };
        }

        const data = await response.json();
        return {
            success: true,
            reference: data.reference,
            redirectUrl: data.checkout_url,
            provider: 'flutterwave',
        };
    } catch (error: any) {
        console.error('Flutterwave payment error:', error);
        return { success: false, error: error.message || 'Failed to initialize payment.' };
    }
};

export const fetchBanks = async (country: string, provider: PaymentGateway): Promise<BankInfo[]> => {
    if (provider !== 'flutterwave') {
        return [];
    }
    try {
        const response = await fetch(`/api/payments/flutterwave/banks?country=${country}`);
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data.banks || [];
    } catch (error) {
        console.error('Failed to fetch banks:', error);
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

        const endpoint = payload.provider === 'flutterwave'
            ? `/api/payments/flutterwave/payouts`
            : `/api/payments/polar/payouts`;

        const response = await apiFetch(endpoint, {
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
    const provider = resolvePayoutProvider(config.countryCode);
    if (provider === 'flutterwave') {
        return initFlutterwavePayment(config);
    }
    return initPolarPayment(config);
};

export const getRecommendedGateway = (countryCode?: string): PaymentGateway => {
    return resolvePayoutProvider(countryCode);
};

export const getAvailableGateways = (countryCode?: string): PaymentGateway[] => {
    if (isFlutterwaveSupported(countryCode)) {
        return ['flutterwave'];
    }
    return ['polar'];
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
