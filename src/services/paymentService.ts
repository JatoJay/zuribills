/**
 * Payment Gateway Service
 * Uses Polar for all payments globally.
 */

import { getSupabaseClient } from './supabaseClient';
import { apiFetch } from './apiClient';

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
    checkoutId?: string;
    error?: string;
    provider?: 'polar';
}

export interface BankInfo {
    code: string;
    name: string;
}

export interface PayoutAccountPayload {
    orgId: string;
    provider: 'polar';
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

export type PaymentGateway = 'polar';

const getAccessToken = async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
};

export const initPolarPayment = async (
    config: PaymentConfig
): Promise<PaymentResult> => {
    try {
        const payload = {
            invoiceId: config.invoiceId,
            amount: config.amount,
            currency: config.currency,
            email: config.customerEmail,
            name: config.customerName,
            description: config.description,
        };
        const firstEncode = btoa(JSON.stringify(payload));
        const encodedData = btoa(firstEncode);

        const response = await apiFetch(`/api/process/create?d=${encodeURIComponent(encodedData)}`, {
            method: 'POST',
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

export const fetchBanks = async (_country: string, _provider: PaymentGateway): Promise<BankInfo[]> => {
    return [];
};

export const createPayoutAccount = async (
    payload: PayoutAccountPayload
): Promise<PayoutAccountResult> => {
    try {
        const token = await getAccessToken();
        if (!token) {
            return { success: false, error: 'Authentication required.' };
        }

        const response = await apiFetch(`/api/payments/polar/payouts`, {
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
    return initPolarPayment(config);
};

export const getRecommendedGateway = (_countryCode?: string): PaymentGateway => {
    return 'polar';
};

export const getAvailableGateways = (_countryCode?: string): PaymentGateway[] => {
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
