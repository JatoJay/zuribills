/**
 * Pricing plan constants and types
 */

export type BillingCycle = 'monthly' | 'yearly';

export interface PricingPlan {
    id: string;
    name: string;
    billingCycle: BillingCycle;
    pricePerMonth: number;
    priceTotal: number; // For yearly, this is the total annual price
    trialDays: number;
    features: string[];
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
    monthly: {
        id: 'monthly',
        name: 'Monthly Plan',
        billingCycle: 'monthly',
        pricePerMonth: 4.99,
        priceTotal: 4.99,
        trialDays: 14,
        features: [
            'Unlimited invoices',
            'AI-powered insights',
            'Service catalog',
            'Multi-currency support',
            'Priority support',
        ],
    },
    yearly: {
        id: 'yearly',
        name: 'Yearly Plan',
        billingCycle: 'yearly',
        pricePerMonth: 4.50,
        priceTotal: 54, // $4.50 x 12 months
        trialDays: 14,
        features: [
            'Unlimited invoices',
            'AI-powered insights',
            'Service catalog',
            'Multi-currency support',
            'Priority support',
        ],
    },
};

export const TRIAL_DURATION_DAYS = 14;

/**
 * Calculate trial end date from start date
 */
export const calculateTrialEndDate = (startDate: Date = new Date()): Date => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);
    return endDate;
};

/**
 * Get pricing plan by ID
 */
export const getPricingPlan = (planId: string): PricingPlan | undefined => {
    return PRICING_PLANS[planId];
};
