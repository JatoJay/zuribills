import { Controller, Get, Post, Req, Res, Body, Query } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import {
    SendInvoiceEmailDto,
    ProvisionTeamMemberDto,
    SendAuthEmailDto,
    TranslateDto,
    AiGenerateDto,
    AfnexChargeDto,
    AfnexVerifyDto,
    FlutterwavePayoutDto,
    BillingInitializeDto,
    MomoInitializeDto,
    MomoPayoutDto,
    SubscriptionStartDto,
} from './dto';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const replyTo = process.env.RESEND_REPLY_TO;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8787/api/auth/google/callback';
const appBaseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:3004';
const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const flutterwaveClientId = process.env.FLUTTERWAVE_CLIENT_ID;
const flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
const flutterwaveEncryptionKey = process.env.FLUTTERWAVE_ENCRYPTION_KEY;
const flutterwaveWebhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const afnexDemoBaseUrl = process.env.AFNEX_DEMO_BASE_URL || 'https://afnex.dev/api/demo';
const platformFeePercent = 0.7;

let flutterwaveAccessToken: string | null = null;
let flutterwaveTokenExpiry = 0;

const getFlutterwaveAccessToken = async (): Promise<string | null> => {
    if (flutterwaveAccessToken && Date.now() < flutterwaveTokenExpiry) {
        return flutterwaveAccessToken;
    }
    if (!flutterwaveClientId || !flutterwaveSecretKey) {
        return null;
    }
    try {
        const response = await fetch('https://api.flutterwave.com/v4/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: flutterwaveClientId,
                client_secret: flutterwaveSecretKey,
            }),
        });
        const data: any = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error('Flutterwave token fetch failed', data);
            return null;
        }
        flutterwaveAccessToken = data?.data?.access_token || data?.access_token;
        const expiresIn = data?.data?.expires_in || data?.expires_in || 3600;
        flutterwaveTokenExpiry = Date.now() + (expiresIn - 60) * 1000;
        return flutterwaveAccessToken;
    } catch (error) {
        console.error('Flutterwave token error', error);
        return null;
    }
};

const getFlutterwaveHeaders = async () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (flutterwaveClientId && flutterwaveSecretKey) {
        const token = await getFlutterwaveAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    } else if (flutterwaveSecretKey) {
        headers['Authorization'] = `Bearer ${flutterwaveSecretKey}`;
    }
    return headers;
};

const FLUTTERWAVE_MOMO_TYPES = {
    RW: 'mobile_money_rwanda',
    GH: 'mobile_money_ghana',
    KE: 'mpesa',
    ZA: 'mobile_money_sa',
};

const FLUTTERWAVE_MOMO_OPTIONS = {
    RW: 'mobilemoneyrwanda',
    GH: 'mobilemoneyghana',
    KE: 'mpesa',
    ZA: 'mobilemoneysa',
};

const MOMO_NETWORK_REQUIRED = new Set(['GH', 'RW']);

const MOMO_COUNTRY_BY_CURRENCY = {
    RWF: 'RW',
    GHS: 'GH',
    KES: 'KE',
    ZAR: 'ZA',
};

const SUBSCRIPTION_PRICING = {
    monthly: { amount: 4.99, label: 'Monthly' },
    yearly: { amount: 54, label: 'Yearly' },
};

const SUBSCRIPTION_CURRENCY = 'USD';


const GOOGLE_LANGUAGE_CODE_MAP: Record<string, string> = {
    // Major languages
    english: 'en',
    french: 'fr',
    spanish: 'es',
    portuguese: 'pt',
    arabic: 'ar',
    german: 'de',
    hindi: 'hi',
    bengali: 'bn',
    'chinese (simplified)': 'zh-CN',
    'chinese (traditional)': 'zh-TW',
    chinese: 'zh-CN',
    japanese: 'ja',
    korean: 'ko',
    italian: 'it',
    dutch: 'nl',
    russian: 'ru',
    turkish: 'tr',
    indonesian: 'id',
    vietnamese: 'vi',

    // African languages
    swahili: 'sw',
    kinyarwanda: 'rw',
    hausa: 'ha',
    yoruba: 'yo',
    igbo: 'ig',
    twi: 'ak',
    zulu: 'zu',
    afrikaans: 'af',
    'nigerian pidgin': 'pcm',
    amharic: 'am',
    somali: 'so',
    xhosa: 'xh',
    shona: 'sn',
    sesotho: 'st',
    setswana: 'tn',

    // Additional aliases and common variations
    pidgin: 'pcm',
    'pidgin english': 'pcm',
    'naija': 'pcm',
    akan: 'ak',
    'simplified chinese': 'zh-CN',
    'traditional chinese': 'zh-TW',
    mandarin: 'zh-CN',
    cantonese: 'zh-TW',

    // European languages
    polish: 'pl',
    ukrainian: 'uk',
    czech: 'cs',
    greek: 'el',
    hungarian: 'hu',
    romanian: 'ro',
    swedish: 'sv',
    norwegian: 'no',
    danish: 'da',
    finnish: 'fi',

    // Middle Eastern / South Asian
    urdu: 'ur',
    persian: 'fa',
    farsi: 'fa',
    hebrew: 'he',
    thai: 'th',
    malayalam: 'ml',
    tamil: 'ta',
    telugu: 'te',
    marathi: 'mr',
    gujarati: 'gu',
    punjabi: 'pa',
    kannada: 'kn',

    // Southeast Asian
    malay: 'ms',
    tagalog: 'tl',
    filipino: 'tl',
    burmese: 'my',
    khmer: 'km',
    lao: 'lo',
};

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

const resolvePlatformFeePercent = (value: any) => {
    const parsed = Number.parseFloat(String(value ?? ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
    }
    return Number.isFinite(platformFeePercent) ? platformFeePercent : 0.7;
};

const createAgentLog = async ({ organizationId, action, details, relatedId, type }: {
    organizationId: string;
    action: string;
    details: string;
    relatedId?: string | null;
    type?: string;
}) => {
    if (!supabaseAdmin || !organizationId) return;
    const { error } = await supabaseAdmin.from('agent_logs').insert({
        id: randomUUID(),
        organization_id: organizationId,
        timestamp: new Date().toISOString(),
        action,
        details,
        related_id: relatedId || null,
        type: type || 'INFO',
    });
    if (error) {
        console.error('Failed to write agent log', error);
    }
};

const hasPayoutLog = async (organizationId: string, relatedId: string) => {
    if (!supabaseAdmin || !organizationId || !relatedId) return false;
    const { data, error } = await supabaseAdmin
        .from('agent_logs')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('related_id', relatedId)
        .eq('action', 'PAYOUT_INITIATED')
        .limit(1);
    if (error) {
        console.error('Failed to check payout logs', error);
        return false;
    }
    return Array.isArray(data) && data.length > 0;
};

const createFlutterwaveTransfer = async (payload: any) => {
    const response = await fetch('https://api.flutterwave.com/v3/transfers', {
        method: 'POST',
        headers: await getFlutterwaveHeaders(),
        body: JSON.stringify(payload),
    });
    const data: any = await response.json().catch(() => ({}));
    return { response, data };
};

const resolveMomoCountry = (bankCountry: string, currency: string) => {
    const normalized = String(bankCountry || '').trim().toUpperCase();
    if (normalized) return normalized;
    const normalizedCurrency = String(currency || '').trim().toUpperCase();
    return MOMO_COUNTRY_BY_CURRENCY[normalizedCurrency] || '';
};

const resolveFlutterwaveMomoType = (countryCode: string) =>
    FLUTTERWAVE_MOMO_TYPES[String(countryCode || '').trim().toUpperCase()] || null;

const resolveFlutterwaveMomoOption = (countryCode: string) =>
    FLUTTERWAVE_MOMO_OPTIONS[String(countryCode || '').trim().toUpperCase()] || null;

const resolveGoogleLanguageCode = (language: string, fallback: string) => {
    if (!language) return fallback;
    const normalized = String(language).trim().toLowerCase();

    // Exact match
    if (GOOGLE_LANGUAGE_CODE_MAP[normalized]) {
        return GOOGLE_LANGUAGE_CODE_MAP[normalized];
    }

    // Try partial match (e.g., "Chinese" should match "chinese (simplified)")
    const keys = Object.keys(GOOGLE_LANGUAGE_CODE_MAP);
    for (const key of keys) {
        if (key.startsWith(normalized) || normalized.startsWith(key)) {
            return GOOGLE_LANGUAGE_CODE_MAP[key];
        }
    }

    // If it looks like a language code already (2-3 chars), use it directly
    if (/^[a-z]{2,3}(-[a-z]{2})?$/i.test(normalized)) {
        return normalized;
    }

    console.warn(`Unknown language: "${language}", falling back to: "${fallback || 'en'}"`);
    return fallback || 'en';
};

const resolveSubscriptionPlan = (billingCycle: string) => {
    const normalized = String(billingCycle || '').trim().toLowerCase();
    if (normalized === 'yearly') return { key: 'yearly', ...SUBSCRIPTION_PRICING.yearly };
    return { key: 'monthly', ...SUBSCRIPTION_PRICING.monthly };
};

const ensureOrgUserAccess = async ({ authUser, org }: { authUser: any; org: any }) => {
    if (!supabaseAdmin) {
        return { error: 'Supabase admin is not configured.', status: 500 };
    }
    if (!authUser?.id) {
        return { error: 'Unauthorized.', status: 401 };
    }
    if (!org?.account_id) {
        return { error: 'Organization account is missing.', status: 500 };
    }

    const authUserId = authUser.id;
    const authEmail = String(authUser.email || '').trim().toLowerCase();

    const { data: directUser, error: directError } = await supabaseAdmin
        .from('users')
        .select('id, account_id, email, name, role, permissions')
        .eq('id', authUserId)
        .maybeSingle();
    if (directError) {
        console.error('Failed to load user by id', directError);
        return { error: 'Failed to load user.', status: 500 };
    }
    if (directUser) {
        if (directUser.account_id !== org.account_id) {
            return { error: 'Not authorized to update this organization.', status: 403 };
        }
        return { user: directUser, repaired: false };
    }

    if (!authEmail) {
        return { error: 'Not authorized to update this organization.', status: 403 };
    }

    const { data: legacyUser, error: legacyError } = await supabaseAdmin
        .from('users')
        .select('id, account_id, email, name, role, permissions')
        .eq('account_id', org.account_id)
        .ilike('email', authEmail)
        .maybeSingle();
    if (legacyError) {
        console.error('Failed to load legacy user by email', legacyError);
        return { error: 'Failed to load user.', status: 500 };
    }
    if (!legacyUser) {
        return { error: 'Not authorized to update this organization.', status: 403 };
    }

    const legacyUserId = legacyUser.id;
    const { error: updateUserError } = await supabaseAdmin
        .from('users')
        .update({
            id: authUserId,
            email: authEmail,
            account_id: org.account_id,
        })
        .eq('id', legacyUserId);
    if (updateUserError) {
        console.error('Failed to update legacy user id', updateUserError);
        return { error: 'Failed to update user.', status: 500 };
    }

    const { error: membershipError } = await supabaseAdmin
        .from('org_memberships')
        .update({ user_id: authUserId })
        .eq('user_id', legacyUserId);
    if (membershipError) {
        console.error('Failed to update org memberships', membershipError);
    }

    const { error: orgOwnerError } = await supabaseAdmin
        .from('organizations')
        .update({ owner_id: authUserId })
        .eq('owner_id', legacyUserId)
        .eq('account_id', org.account_id);
    if (orgOwnerError) {
        console.error('Failed to update organization owners', orgOwnerError);
    }

    const { error: accountOwnerError } = await supabaseAdmin
        .from('accounts')
        .update({ owner_user_id: authUserId })
        .eq('id', org.account_id)
        .eq('owner_user_id', legacyUserId);
    if (accountOwnerError) {
        console.error('Failed to update account owner', accountOwnerError);
    }

    return {
        user: {
            ...legacyUser,
            id: authUserId,
            email: authEmail,
            account_id: org.account_id,
        },
        repaired: true,
    };
};

const normalizeAfnexStatus = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'success' || normalized === 'successful') return 'SUCCESS';
    if (normalized === 'pending') return 'PENDING';
    if (normalized === 'failed' || normalized === 'error') return 'FAILED';
    return normalized ? normalized.toUpperCase() : '';
};

const parseAfnexAmount = (value: any, fallback: any) => {
    const numeric = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(numeric)) return numeric;
    const fallbackValue = Number.parseFloat(String(fallback ?? ''));
    return Number.isFinite(fallbackValue) ? fallbackValue : 0;
};

const triggerInstantPayout = async ({
    org,
    invoice,
    amount,
    currency,
    reference,
}: {
    org: any;
    invoice: any;
    amount: number;
    currency: string;
    reference: string;
}) => {
    if (!flutterwaveSecretKey || !supabaseAdmin || !org || !invoice) return;
    const paymentConfig = org.payment_config || {};
    
    // Support both bank and momo for instant payouts
    const isMomo = paymentConfig.provider === 'momo' || !!paymentConfig.momoMsisdn;
    const accountBank = isMomo ? (paymentConfig.bankCode || 'MTN') : paymentConfig.bankCode;
    let accountNumber = isMomo ? paymentConfig.momoMsisdn : (paymentConfig.accountNumber || paymentConfig.account_number);
    
    // Fallback for legacy organizations: Use subaccount ID if the full account number is missing
    if (!accountNumber && !isMomo && paymentConfig.accountId) {
        accountNumber = paymentConfig.accountId;
    }

    if (!accountBank || !accountNumber) {
        console.error(`Instant payout skipped for Org ${org.id}: missing bank details. Bank: ${accountBank}, Acc: ${!!accountNumber}`);
        return;
    }

    // Use net amount (1.5% fee already considered or to be deducted here)
    const feePercent = platformFeePercent;
    const netAmount = Number.isFinite(amount) ? (amount * (1 - (feePercent / 100))) : 0;
    const payoutAmount = Math.round(netAmount * 100) / 100;
    
    if (payoutAmount <= 0) return;

    // Check if payout was already successful
    const { count: existingSuccess } = await supabaseAdmin
        .from('agent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('related_id', invoice.id)
        .eq('action', 'PAYOUT_SENT');

    if ((existingSuccess || 0) > 0) return;

    const transferReference = reference || `payout_${invoice.id}_${Date.now()}`;
    const payload: any = {
        account_bank: accountBank,
        account_number: accountNumber,
        amount: payoutAmount,
        currency,
        narration: `Invoice ${invoice.invoice_number} instant payout`,
        reference: transferReference,
        beneficiary_name: paymentConfig.accountName || paymentConfig.momoAccountName || org.name,
        meta: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            organization_id: org.id,
            payout_type: 'instant',
        },
    };

    try {
        const { response, data } = await createFlutterwaveTransfer(payload);
        if (!response.ok) {
            const errorMsg = data?.message || 'Transfer failed';
            console.error('Flutterwave instant payout failed', data);
            
            // Log the specific failure reason
            await createAgentLog({
                organizationId: org.id,
                action: 'PAYOUT_FAILED',
                details: JSON.stringify({
                    provider: 'flutterwave',
                    reference: transferReference,
                    error: errorMsg,
                    code: data?.code,
                }),
                relatedId: invoice.id,
                type: 'WARNING',
            });
            return;
        }

        await createAgentLog({
            organizationId: org.id,
            action: 'PAYOUT_SENT',
            details: JSON.stringify({
                provider: 'flutterwave',
                amount: payoutAmount,
                currency,
                reference: transferReference,
                status: data?.data?.status || 'pending',
                transferId: data?.data?.id,
            }),
            relatedId: invoice.id,
            type: 'INFO',
        });
    } catch (error) {
        console.error('Flutterwave instant payout error', error);
    }
};

const escapeHtml = (input = '') =>
    input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const buildHtmlBody = (text: string) => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return '';
    return `
        <div style="font-family: Arial, sans-serif; color: #0b0b0b; line-height: 1.6;">
            ${lines.map((line) => `<p style="margin: 0 0 12px;">${escapeHtml(line)}</p>`).join('')}
        </div>
    `;
};

const getBearerToken = (req: Request) => {
    const header = req.headers.authorization || '';
    if (!header) return null;
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) return null;
    return token;
};

const getAuthenticatedUser = async (req: Request) => {
    if (!supabaseAdmin) {
        return { error: 'Supabase admin is not configured.' };
    }
    const token = getBearerToken(req);
    if (!token) {
        return { error: 'Missing authorization token.' };
    }
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
        return { error: 'Invalid authorization token.' };
    }
    return { user: data.user };
};

const parseInvoiceIdFromRef = (ref: string) => {
    if (!ref) return null;
    const match = String(ref).match(/^inv_([^_]+)_/);
    return match ? match[1] : null;
};

const getMomoToken = async ({ userId, apiKey, subscriptionKey, product }: {
    userId?: string;
    apiKey?: string;
    subscriptionKey?: string;
    product: string;
}) => {
    return null;
};

const getMomoCollectionToken = () => null;

const getMomoDisbursementToken = () => null;

const RATE_CACHE_TTL_MS = 5 * 60 * 1000;
const rateCache = new Map<string, { rate: number; source: string; timestamp: number }>();

const getCachedRate = (key: string) => {
    const entry = rateCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > RATE_CACHE_TTL_MS) {
        rateCache.delete(key);
        return null;
    }
    return entry;
};

const setCachedRate = (key: string, rate: number, source: string) => {
    rateCache.set(key, { rate, source, timestamp: Date.now() });
};

const fetchStripeRate = async (from: string, to: string) => {
    if (!stripeSecretKey) return null;
    const response = await fetch(`https://api.stripe.com/v1/exchange_rates/${from.toLowerCase()}`, {
        headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
        },
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error('Stripe rate error', data);
        return null;
    }
    const rateValue = data?.rates?.[to.toLowerCase()];
    const rate = Number.parseFloat(rateValue);
    return Number.isFinite(rate) ? rate : null;
};

const fetchFlutterwaveRate = async (from: string, to: string, amount = 1) => {
    if (!flutterwaveSecretKey) return null;
    const response = await fetch(`https://api.flutterwave.com/v3/rates?from=${from}&to=${to}&amount=${amount}`, {
        headers: await getFlutterwaveHeaders(),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error('Flutterwave rate error', data);
        return null;
    }
    const rateValue = data?.data?.rate ?? data?.data?.exchange_rate ?? data?.data?.fx_rate ?? data?.rate;
    const rate = Number.parseFloat(rateValue);
    return Number.isFinite(rate) ? rate : null;
};

const sanitizeRedirectPath = (redirectPath: any) => {
    if (typeof redirectPath !== 'string' || !redirectPath.startsWith('/')) {
        return '/onboarding';
    }
    return redirectPath;
};

const buildAppRedirect = (redirectPath: string, params: Record<string, string>) => {
    const targetUrl = new URL(redirectPath, appBaseUrl);
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value) {
            targetUrl.searchParams.set(key, value);
        }
    });
    return targetUrl.toString();
};

@Controller()
export class AppController {
    @Get('health')
    health(@Res() res: Response) {
        return res.json({ status: 'ok' });
    }

    @Post('email/send-invoice')
    async sendInvoice(@Body() dto: SendInvoiceEmailDto, @Res() res: Response) {
        if (!resend || !resendApiKey) {
            return res.status(500).json({ error: 'RESEND_API_KEY is not configured.' });
        }
        if (!fromEmail) {
            return res.status(500).json({ error: 'RESEND_FROM_EMAIL is not configured.' });
        }

        const { to, subject, body, invoiceNumber, clientName } = dto;

        const defaultSubject = invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice';
        const textBody = body?.trim()
            || `Hi ${clientName || 'there'},\n\nYour invoice ${invoiceNumber || ''} is ready.\n\nThanks.`;
        const htmlBody = buildHtmlBody(textBody);

        try {
            const result = await resend.emails.send({
                from: fromEmail,
                to,
                subject: subject || defaultSubject,
                text: textBody,
                html: htmlBody || undefined,
                replyTo: replyTo || undefined,
            });

            return res.json({ id: result.data?.id });
        } catch (error) {
            console.error('Resend send failed:', error);
            return res.status(500).json({ error: 'Failed to send email.' });
        }
    }

    @Post('team/provision')
    async provisionTeamMember(@Body() dto: ProvisionTeamMemberDto, @Req() req: Request, @Res() res: Response) {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { user: authUser, error: authError } = await getAuthenticatedUser(req);
        if (authError || !authUser) {
            return res.status(401).json({ error: authError || 'Unauthorized.' });
        }

        const { email, name, role, organizationId, permissions, pin } = dto;

        // 1. Verify inviter has access to the org
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, account_id')
            .eq('id', organizationId)
            .maybeSingle();

        if (orgError || !org) {
            return res.status(404).json({ error: 'Organization not found.' });
        }

        // 2. Create Auth User
        const defaultPassword = `IF-${Math.random().toString(36).slice(-8)}!`;
        const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: { name },
        });

        if (createAuthError) {
            // If user already exists, we might just want to link them, but for "provisioning" we expect new users
            if (createAuthError.message.includes('already registered')) {
                // Handle existing user logic if needed
            } else {
                console.error('Failed to create auth user', createAuthError);
                return res.status(500).json({ error: createAuthError.message });
            }
        }

        let targetUserId = newAuthUser?.user?.id;
        if (!targetUserId) {
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
            for (const u of (userList?.users || [])) {
                if (u.email?.toLowerCase() === email.toLowerCase()) {
                    targetUserId = u.id;
                    break;
                }
            }
        }

        if (!targetUserId) {
            return res.status(500).json({ error: 'Could not resolve User ID' });
        }

        const { error: userTableError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: targetUserId,
                account_id: org.account_id,
                email: email.toLowerCase(),
                name,
                role: role || 'ASSISTANT',
                permissions: permissions || [],
                pin: pin || null,
            });

        if (userTableError) {
            console.error('Failed to update users table', userTableError);
        }

        // 4. Create Org Membership
        await supabaseAdmin.from('org_memberships').upsert({
            organization_id: organizationId,
            user_id: targetUserId,
            role: role || 'ASSISTANT',
            permissions: permissions || [],
        });

        // 5. Send Welcome Email
        if (resend && fromEmail) {
            await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: `Welcome to ${org.name} on InvoiceFlow`,
                text: `Hi ${name},\n\nYou've been added to ${org.name}. Log in with:\nEmail: ${email}\nPassword: ${defaultPassword}\n\n${appBaseUrl}/login`,
                html: buildHtmlBody(`Hi ${name},\n\nYou've been added to ${org.name} on InvoiceFlow. \n\nYou can log in using the details below:\n\nEmail: ${email}\nPassword: <strong>${defaultPassword}</strong>\n\n<a href="${appBaseUrl}/login">Log in here</a>\n\nFor security, please change your password after your first login.`),
            });
        }

        return res.json({ success: true, userId: targetUserId });
    }

    @Post('email/auth')
    async sendAuthEmail(@Body() dto: SendAuthEmailDto, @Res() res: Response) {
        if (!resend || !resendApiKey) {
            return res.status(500).json({ error: 'RESEND_API_KEY is not configured.' });
        }
        if (!fromEmail) {
            return res.status(500).json({ error: 'RESEND_FROM_EMAIL is not configured.' });
        }

        const { to, type, data } = dto;

        let subject = '';
        let body = '';

        switch (type) {
            case 'welcome':
                subject = 'Welcome to InvoiceFlow!';
                body = `Hi ${data?.name || 'there'},\n\nWelcome to InvoiceFlow! Your account has been created successfully. You can now start managing your invoices and expenses.\n\nBest,\nThe InvoiceFlow Team`;
                break;
            case 'login_alert':
                subject = 'New Login to Your Account';
                body = `Hello,\n\nWe detected a new login to your InvoiceFlow account on ${new Date().toLocaleString()}.\n\nIf this wasn't you, please reset your password immediately.\n\nBest,\nThe InvoiceFlow Team`;
                break;
            case 'password_reset':
                subject = 'Password Reset Request';
                body = `Hello,\n\nYou requested a password reset for your InvoiceFlow account. Click the link below to set a new password:\n\n${appBaseUrl}/login?reset_token=${data?.token}\n\nIf you didn't request this, you can safely ignore this email.\n\nBest,\nThe InvoiceFlow Team`;
                break;
            case 'team_invite':
                subject = `You've been added to ${data?.orgName || 'a workspace'} on InvoiceFlow`;
                body = `Hi ${data?.name || 'there'},\n\n${data?.inviterName || 'An administrator'} has added you to the ${data?.orgName || 'workspace'} on InvoiceFlow.\n\nYou can log in using the details below:\n\nEmail: ${to}\nPassword: ${data?.password}\n\nLog in here: ${appBaseUrl}/login\n\nFor security, please change your password after your first login.\n\nBest,\nThe InvoiceFlow Team`;
                break;
            default:
                return res.status(400).json({ error: 'Invalid email type.' });
        }

        try {
            const result = await resend.emails.send({
                from: fromEmail,
                to,
                subject,
                text: body,
                html: buildHtmlBody(body),
            });
            return res.json({ id: result.data?.id });
        } catch (error) {
            console.error('Resend auth email failed:', error);
            return res.status(500).json({ error: 'Failed to send auth email.' });
        }
    }

    @Get('payments/flutterwave/banks')
    async getFlutterwaveBanks(@Req() req: Request, @Res() res: Response) {
        const country = String(req.query.country || 'NG').toUpperCase();
        try {
            const response = await fetch(`https://api.flutterwave.com/v3/banks/${country}`, {
                headers: await getFlutterwaveHeaders(),
            });
            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
                console.error('Flutterwave bank list failed', data);
                return res.status(response.status).json({ error: data?.message || 'Failed to load banks.' });
            }
            const banks = (data?.data || [])
                .map((bank: any) => ({
                    code: String(bank.code ?? bank.id ?? ''),
                    name: bank.name || bank.bank_name || '',
                }))
                .filter((bank: any) => bank.code && bank.name);

            return res.json({ banks });
        } catch (error) {
            console.error('Flutterwave bank list error', error);
            return res.status(500).json({ error: 'Failed to load banks.' });
        }
    }

    @Get('payments/rates')
    async getRates(@Req() req: Request, @Res() res: Response) {
        const from = String(req.query.from || '').toUpperCase();
        const to = String(req.query.to || '').toUpperCase();
        const provider = String(req.query.provider || '').toLowerCase();
        const amount = Number.parseFloat(String(req.query.amount || '1'));

        if (!from || !to) {
            return res.status(400).json({ error: 'from and to are required.' });
        }
        if (from === to) {
            return res.json({ rate: 1, source: 'same-currency' });
        }

        const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
        const requestedProviders: string[] = [];
        if (provider) {
            requestedProviders.push(provider);
        }
        if (!requestedProviders.includes('flutterwave')) requestedProviders.push('flutterwave');
        if (!requestedProviders.includes('stripe')) requestedProviders.push('stripe');

        for (const current of requestedProviders) {
            const cacheKey = `${current}:${from}:${to}`;
            const cached = getCachedRate(cacheKey);
            if (cached) {
                return res.json({ rate: cached.rate, source: cached.source, cached: true });
            }

            let rate = null;
            if (current === 'stripe') {
                rate = await fetchStripeRate(from, to);
            } else if (current === 'flutterwave') {
                rate = await fetchFlutterwaveRate(from, to, safeAmount);
            }

            if (Number.isFinite(rate)) {
                setCachedRate(cacheKey, rate as number, current);
                return res.json({ rate, source: current, cached: false });
            }
        }

        return res.status(503).json({ error: 'No exchange rate available from configured providers.' });
    }

    @Get('payments/afnex/providers')
    async getAfnexProviders(@Req() req: Request, @Res() res: Response) {
        try {
            const response = await fetch(`${afnexDemoBaseUrl}/providers`);
            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Failed to fetch Afnex providers', error);
            return res.status(500).json({ error: 'Failed to fetch providers.' });
        }
    }

    @Post('payments/afnex/charge')
    async chargeAfnex(@Body() dto: AfnexChargeDto, @Res() res: Response) {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { invoiceId, provider, payerPhone, customerEmail } = dto;

        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('id, organization_id, total, client_name, client_email, invoice_number')
            .eq('id', invoiceId)
            .maybeSingle();
        if (invoiceError || !invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, slug, currency, payment_config')
            .eq('id', invoice.organization_id)
            .maybeSingle();
        if (orgError || !org) {
            return res.status(404).json({ error: 'Organization not found.' });
        }

        const currency = String(org.currency || 'USD').toUpperCase();
        const payload: Record<string, any> = {
            provider: provider || 'flutterwave',
            amount: invoice.total,
            currency,
            metadata: {
                invoice_id: invoice.id,
                organization_id: org.id,
                invoice_number: invoice.invoice_number,
            },
        };

        if (payerPhone) {
            payload.phone = payerPhone;
        }
        if (customerEmail || invoice.client_email) {
            payload.email = customerEmail || invoice.client_email;
        }

        try {
            const response = await fetch(`${afnexDemoBaseUrl}/charge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
                return res.status(response.status).json({ error: data?.error || 'Failed to initialize payment.' });
            }

            return res.json({
                reference: data?.reference,
                provider: data?.provider,
                paymentUrl: data?.payment_url || data?.link,
                status: data?.status,
            });
        } catch (error) {
            console.error('Afnex charge error', error);
            return res.status(500).json({ error: 'Failed to initialize payment.' });
        }
    }

    @Post('payments/afnex/verify')
    async verifyAfnex(@Body() dto: AfnexVerifyDto, @Res() res: Response) {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { reference, provider, invoiceId } = dto;

        try {
            const response = await fetch(`${afnexDemoBaseUrl}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, reference }),
            });
            const data: any = await response.json().catch(() => ({}));
            
            if (data?.status === 'SUCCESS') {
                // Update invoice status
                await supabaseAdmin.from('invoices').update({ status: 'PAID' }).eq('id', invoiceId);
                
                // Fetch org and invoice for instant payout
                const { data: invoice } = await supabaseAdmin.from('invoices').select('*').eq('id', invoiceId).single();
                const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', invoice.organization_id).single();
                
                if (org && invoice) {
                    await triggerInstantPayout({
                        org,
                        invoice,
                        amount: data.amount || invoice.total,
                        currency: data.currency || org.currency,
                        reference: reference,
                    });
                }
            }

            return res.json(data);
        } catch (error) {
            console.error('Afnex verify error', error);
            return res.status(500).json({ error: 'Failed to verify payment.' });
        }
    }

    @Post('payments/flutterwave/payouts')
    async createFlutterwavePayout(@Body() dto: FlutterwavePayoutDto, @Req() req: Request, @Res() res: Response) {
        if (!flutterwaveSecretKey) {
            return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured.' });
        }
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { user, error: authError } = await getAuthenticatedUser(req);
        if (authError || !user) {
            return res.status(401).json({ error: authError || 'Unauthorized.' });
        }

        const { orgId, bankCode, bankName, accountNumber, accountName, bankCountry } = dto;

        const bankCodeValue = bankCode.trim();
        const accountNumberValue = accountNumber.trim();
        const accountNameValue = accountName.trim();
        const bankCountryValue = bankCountry.trim().toUpperCase();

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, account_id, name, contact_email, contact_phone, payment_config')
            .eq('id', orgId)
            .maybeSingle();
        if (orgError) {
            console.error('Failed to load organization', orgError);
            return res.status(500).json({ error: 'Failed to load organization.' });
        }
        if (!org) {
            return res.status(404).json({ error: 'Organization not found.' });
        }

        const accessResult = await ensureOrgUserAccess({ authUser: user, org });
        if (accessResult?.error) {
            return res.status(accessResult.status || 403).json({ error: accessResult.error });
        }
        const userRow = accessResult.user;
        if (!userRow) {
            return res.status(403).json({ error: 'Not authorized to update this organization.' });
        }

        const country = bankCountryValue;
        const feePercent = resolvePlatformFeePercent(org.payment_config?.platformFeePercent);

        const splitValue = Math.max(0, Math.min(feePercent / 100, 1));
        const payload = {
            account_bank: bankCodeValue,
            account_number: accountNumberValue,
            business_name: org.name,
            business_email: org.contact_email || user.email,
            business_contact: userRow.name || org.name,
            business_contact_mobile: org.contact_phone || undefined,
            country,
            split_type: 'percentage',
            split_value: splitValue,
            meta: {
                org_id: org.id,
                platform_fee_percent: String(feePercent),
            },
        };

        try {
            const response = await fetch('https://api.flutterwave.com/v3/subaccounts', {
                method: 'POST',
                headers: await getFlutterwaveHeaders(),
                body: JSON.stringify(payload),
            });
            const data: any = await response.json().catch(() => ({}));
            let subaccount = data?.data;

            if (!response.ok) {
                const errorMsg = data?.message || '';
                console.error('Flutterwave subaccount failed', data);

                // Rescue Logic: If subaccount exists, fetch it and link it
                if (errorMsg.toLowerCase().includes('already exists')) {
                    try {
                        const listResponse = await fetch('https://api.flutterwave.com/v3/subaccounts', {
                            headers: await getFlutterwaveHeaders(),
                        });
                        const listData: any = await listResponse.json();
                        const existing = listData?.data?.find(
                            (s: any) =>
                                String(s.account_number) === String(accountNumberValue) &&
                                String(s.account_bank) === String(bankCodeValue)
                        );
                        if (existing) {
                            subaccount = existing;
                            console.log(`Rescued existing subaccount: ${existing.id}`);
                        } else {
                            return res.status(response.status).json({ error: 'Subaccount already exists on Flutterwave but could not be retrieved. Please contact support.' });
                        }
                    } catch (rescueError) {
                        console.error('Failed to rescue existing subaccount', rescueError);
                        return res.status(response.status).json({ error: 'Subaccount exists but retrieval failed.' });
                    }
                } else {
                    return res.status(response.status).json({ error: data?.message || 'Failed to create payout account.' });
                }
            }

            const subaccountId = subaccount?.id || subaccount?.subaccount_id || subaccount?.account_id;
            if (!subaccountId) {
                return res.status(500).json({ error: 'Flutterwave did not return a subaccount ID.' });
            }

            const accountNumberLast4 = accountNumberValue.slice(-4);
            const updatedPaymentConfig = {
                ...(org.payment_config || {}),
                enabled: true,
                provider: 'flutterwave',
                accountId: String(subaccountId),
                bankName: bankName || subaccount.bank_name || null,
                bankCode: bankCodeValue,
                bankCountry: country,
                accountName: accountNameValue || subaccount.account_name || null,
                accountNumber: accountNumberValue, // Storing full number for Instant Payouts
                accountNumberLast4,
                platformFeePercent: feePercent,
            };

            const { error: updateError } = await supabaseAdmin
                .from('organizations')
                .update({ payment_config: updatedPaymentConfig })
                .eq('id', org.id);
            if (updateError) {
                console.error('Failed to update organization payout config', updateError);
                return res.status(500).json({ error: 'Failed to update payout configuration.' });
            }

            return res.json({
                accountId: updatedPaymentConfig.accountId,
                bankName: updatedPaymentConfig.bankName,
                bankCode: updatedPaymentConfig.bankCode,
                bankCountry: updatedPaymentConfig.bankCountry,
                accountName: updatedPaymentConfig.accountName,
                accountNumberLast4: updatedPaymentConfig.accountNumberLast4,
            });
        } catch (error) {
            console.error('Flutterwave subaccount error', error);
            return res.status(500).json({ error: 'Failed to create payout account.' });
        }
    }

    @Post('billing/flutterwave/initialize')
    async initializeFlutterwaveBilling(@Body() dto: BillingInitializeDto, @Req() req: Request, @Res() res: Response) {
        if (!flutterwaveSecretKey) {
            return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured.' });
        }
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { user, error: authError } = await getAuthenticatedUser(req);
        if (authError || !user) {
            return res.status(401).json({ error: authError || 'Unauthorized.' });
        }

        const { orgId, billingCycle } = dto;

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, slug, account_id, owner_id, name, contact_email')
            .eq('id', orgId)
            .maybeSingle();
        if (orgError) {
            console.error('Failed to load organization', orgError);
            return res.status(500).json({ error: 'Failed to load organization.' });
        }
        if (!org) {
            return res.status(404).json({ error: 'Organization not found.' });
        }

        const accessResult = await ensureOrgUserAccess({ authUser: user, org });
        if (accessResult?.error) {
            return res.status(accessResult.status || 403).json({ error: accessResult.error });
        }
        const userRow = accessResult.user;
        const isOwner = userRow?.role === 'OWNER' || userRow?.role === 'ADMIN' || org.owner_id === user.id;
        if (!isOwner) {
            return res.status(403).json({ error: 'Only account owners can upgrade subscriptions.' });
        }

        const plan = resolveSubscriptionPlan(billingCycle);
        const txRef = `sub_${org.account_id}_${Date.now()}`;
        const redirectUrl = `${appBaseUrl}/org/${org.slug}?billing=processing`;

        const payload = {
            tx_ref: txRef,
            amount: plan.amount,
            currency: SUBSCRIPTION_CURRENCY,
            redirect_url: redirectUrl,
            customer: {
                email: user.email || org.contact_email,
                name: userRow?.name || org.name,
            },
            meta: {
                account_id: org.account_id,
                organization_id: org.id,
                billing_cycle: plan.key,
                billing_type: 'subscription',
            },
            customizations: {
                title: 'InvoiceFlow Subscription',
                description: `${plan.label} plan`,
            },
        };

        try {
            const response = await fetch('https://api.flutterwave.com/v3/payments', {
                method: 'POST',
                headers: await getFlutterwaveHeaders(),
                body: JSON.stringify(payload),
            });

            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
                console.error('Flutterwave subscription init failed', data);
                return res.status(response.status).json({ error: data?.message || 'Flutterwave initialization failed.' });
            }
            const link = data?.data?.link;
            if (!link) {
                return res.status(500).json({ error: 'Flutterwave did not return a payment link.' });
            }
            return res.json({ link, reference: txRef });
        } catch (error) {
            console.error('Flutterwave subscription init error', error);
            return res.status(500).json({ error: 'Failed to initialize Flutterwave payment.' });
        }
    }

    @Post('payments/momo/initialize')
    async initializeMomo(@Body() dto: MomoInitializeDto, @Res() res: Response) {
        if (!flutterwaveSecretKey) {
            return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured.' });
        }
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { invoiceId, payerPhone, payerNetwork } = dto;
        const trimmedPhone = payerPhone.replace(/\s+/g, '').trim();
        const trimmedNetwork = (payerNetwork || '').trim().toUpperCase();

        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('id, organization_id, total, client_name, client_email, invoice_number')
            .eq('id', invoiceId)
            .maybeSingle();
        if (invoiceError) {
            console.error('Failed to load invoice', invoiceError);
            return res.status(500).json({ error: 'Failed to load invoice.' });
        }
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, slug, currency, payment_config, name')
            .eq('id', invoice.organization_id)
            .maybeSingle();
        if (orgError) {
            console.error('Failed to load organization', orgError);
            return res.status(500).json({ error: 'Failed to load organization.' });
        }
        if (!org) {
            return res.status(404).json({ error: 'Organization not found.' });
        }

        const paymentConfig = org.payment_config || {};
        const paymentsEnabled = paymentConfig.enabled === true && paymentConfig.momoMsisdn;
        if (!paymentsEnabled || paymentConfig.provider !== 'momo') {
            return res.status(400).json({ error: 'MoMo payments are not enabled for this organization.' });
        }

        const currency = String(org.currency || 'USD').toUpperCase();
        const momoCountry = resolveMomoCountry(paymentConfig.bankCountry, currency);
        const chargeType = resolveFlutterwaveMomoType(momoCountry);
        const paymentOption = resolveFlutterwaveMomoOption(momoCountry);

        if (!chargeType) {
            return res.status(400).json({ error: 'Mobile money is not supported for this country.' });
        }
        if (MOMO_NETWORK_REQUIRED.has(momoCountry) && !trimmedNetwork) {
            return res.status(400).json({ error: 'Mobile money network is required for this country.' });
        }

        const txRef = `momo_${invoice.id}_${Date.now()}`;
        const redirectUrl = `${appBaseUrl}/catalog/${org.slug}/invoice/${invoice.id}`;
        const payload: Record<string, any> = {
            tx_ref: txRef,
            amount: Number.parseFloat(String(invoice.total || '0')),
            currency,
            country: momoCountry,
            email: invoice.client_email,
            phone_number: trimmedPhone,
            fullname: invoice.client_name,
            redirect_url: redirectUrl,
            meta: {
                invoice_id: invoice.id,
                organization_id: org.id,
                platform_fee_percent: String(resolvePlatformFeePercent(paymentConfig.platformFeePercent)),
            },
        };
        if (trimmedNetwork) {
            payload.network = trimmedNetwork;
        } else if (momoCountry === 'RW') {
            payload.network = 'MTN'; // Default to MTN for Rwanda if not specified
        }

        try {
            console.log(`Initializing MoMo charge for ${momoCountry} (${chargeType}) with network: ${payload.network || 'none'}`);
            console.log('Payload:', JSON.stringify(payload));
            const response = await fetch(`https://api.flutterwave.com/v3/charges?type=${encodeURIComponent(chargeType)}`, {
                method: 'POST',
                headers: await getFlutterwaveHeaders(),
                body: JSON.stringify(payload),
            });

            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
                console.error('Flutterwave MoMo charge failed. Status:', response.status, 'Data:', JSON.stringify(data));
                if (paymentOption) {
                    const linkPayload = {
                        tx_ref: txRef,
                        amount: Number.parseFloat(String(invoice.total || '0')),
                        currency,
                        country: momoCountry,
                        redirect_url: redirectUrl,
                        payment_options: paymentOption,
                        customer: {
                            email: invoice.client_email,
                            name: invoice.client_name,
                            phone_number: trimmedPhone,
                        },
                        meta: payload.meta,
                        customizations: {
                            title: `${org.name} Invoice`,
                            description: `Invoice ${invoice.invoice_number}`,
                        },
                    };
                    const linkResponse = await fetch('https://api.flutterwave.com/v4/payments', {
                        method: 'POST',
                        headers: await getFlutterwaveHeaders(),
                        body: JSON.stringify(linkPayload),
                    });
                    const linkData: any = await linkResponse.json().catch(() => ({}));
                    if (!linkResponse.ok) {
                        console.error('Flutterwave fallback payment failed', linkData);
                        return res.status(linkResponse.status).json({ error: linkData?.message || 'Failed to initialize MoMo payment.' });
                    }
                    const link = linkData?.data?.link;
                    if (!link) {
                        return res.status(500).json({ error: 'Flutterwave did not return a payment link.' });
                    }
                    return res.json({ reference: txRef, referenceType: 'tx_ref', link });
                }
                return res.status(response.status).json({ error: data?.message || 'Failed to initialize MoMo payment.' });
            }

            const chargeData = data?.data || {};
            const resolvedTxRef = chargeData?.tx_ref || txRef;
            const reference = chargeData?.id ? String(chargeData.id) : resolvedTxRef;
            const referenceType = chargeData?.id ? 'id' : 'tx_ref';
            return res.json({
                reference,
                referenceType,
                txRef: resolvedTxRef,
                status: chargeData?.status || 'pending',
            });
        } catch (error) {
            console.error('Flutterwave MoMo initialize error', error);
            return res.status(500).json({ error: 'Failed to initialize MoMo payment.' });
        }
    }

    @Get('payments/momo/status')
    async getMomoStatus(@Req() req: Request, @Res() res: Response) {
        if (!flutterwaveSecretKey) {
            return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured.' });
        }
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const reference = String(req.query.reference || '').trim();
        const referenceType = String(req.query.type || '').trim().toLowerCase();
        const txRef = String(req.query.txRef || '').trim();
        const invoiceId = String(req.query.invoiceId || '').trim();
        if (!reference) {
            return res.status(400).json({ error: 'reference is required.' });
        }

        try {
            const isIdReference = referenceType === 'id';
            const endpoint = isIdReference
                ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(reference)}/verify`
                : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
            const response = await fetch(endpoint, {
                headers: await getFlutterwaveHeaders(),
            });
            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = String(data?.message || '').toLowerCase();
                if (response.status === 404 || message.includes('no transaction')) {
                    if (isIdReference && txRef) {
                        const fallbackResponse = await fetch(
                            `https://api.flutterwave.com/v4/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
                            { headers: await getFlutterwaveHeaders() }
                        );

                        const fallbackData: any = await fallbackResponse.json().catch(() => ({}));
                        if (fallbackResponse.ok) {
                            return res.json({ status: String(fallbackData?.data?.status || 'PENDING').toUpperCase() });
                        }
                    }
                    return res.json({ status: 'PENDING' });
                }
                console.error('Flutterwave MoMo status check failed', data);
                return res.status(response.status).json({ error: data?.message || 'Failed to check MoMo status.' });
            }

            const flwStatus = String(data?.data?.status || '').toUpperCase();
            const normalizedStatus = flwStatus === 'SUCCESSFUL' ? 'SUCCESSFUL'
                : flwStatus === 'FAILED' || flwStatus === 'CANCELLED' ? 'FAILED'
                    : 'PENDING';
            const resolvedInvoiceId = data?.data?.meta?.invoice_id
                || data?.data?.meta?.invoiceId
                || invoiceId;

            if (normalizedStatus === 'SUCCESSFUL' && resolvedInvoiceId) {
                const { data: invoice, error: invoiceError } = await supabaseAdmin
                    .from('invoices')
                    .select('id, organization_id, total, invoice_number')
                    .eq('id', resolvedInvoiceId)
                    .maybeSingle();
                if (invoiceError) {
                    console.error('Failed to load invoice for MoMo status', invoiceError);
                }

                if (invoice) {
                    const { data: org, error: orgError } = await supabaseAdmin
                        .from('organizations')
                        .select('id, payment_config, name, currency')
                        .eq('id', invoice.organization_id)
                        .maybeSingle();
                    if (orgError) {
                        console.error('Failed to load org for MoMo status', orgError);
                    }

                    const feePercent = resolvePlatformFeePercent(
                        data?.data?.meta?.platform_fee_percent
                        || data?.data?.meta?.platformFeePercent
                        || org?.payment_config?.platformFeePercent
                    );
                    const amount = Number.parseFloat(String(data?.data?.amount || invoice.total || '0'));
                    const platformFeeAmount = Number.isFinite(amount)
                        ? Math.round((amount * (feePercent / 100)) * 100) / 100
                        : 0;
                    const netAmount = Number.isFinite(amount) ? amount - platformFeeAmount : 0;
                    const transactionId = data?.data?.id;
                    const paymentId = transactionId ? `flw_${transactionId}` : `flw_${reference}`;

                    const paymentRecord = {
                        id: paymentId,
                        invoice_id: invoice.id,
                        amount: Number.isFinite(amount) ? amount : 0,
                        currency: data?.data?.currency || org?.currency || null,
                        status: flwStatus || normalizedStatus,
                        provider: 'flutterwave',
                        provider_reference: data?.data?.flw_ref || data?.data?.tx_ref || reference,
                        platform_fee_percent: feePercent,
                        platform_fee_amount: platformFeeAmount,
                        net_amount: netAmount,
                        date: new Date().toISOString(),
                        method: 'momo',
                    };

                    const { error: paymentError } = await supabaseAdmin
                        .from('payments')
                        .upsert(paymentRecord, { onConflict: 'id' });
                    if (paymentError) {
                        console.error('Failed to record MoMo payment', paymentError);
                    }

                    const { error: invoiceUpdateError } = await supabaseAdmin
                        .from('invoices')
                        .update({ status: 'PAID' })
                        .eq('id', invoice.id);
                    if (invoiceUpdateError) {
                        console.error('Failed to update invoice status for MoMo', invoiceUpdateError);
                    }

                    const payoutCurrency = data?.data?.currency || org?.currency || 'USD';
                    await triggerInstantPayout({
                        org,
                        invoice,
                        amount: data.data.amount,
                        currency: data.data.currency,
                        reference: `payout_${data.data.id}`,
                    });

                }
            }

            return res.json({ status: normalizedStatus });
        } catch (error) {
            console.error('Flutterwave MoMo status error', error);
            return res.status(500).json({ error: 'Failed to check MoMo status.' });
        }
    }

    @Post('payments/flutterwave/initialize')
    async initializeFlutterwave(@Req() req: Request, @Res() res: Response) {
        if (!flutterwaveSecretKey) {
            return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured.' });
        }
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const { invoiceId } = req.body || {};
        if (!invoiceId) {
            return res.status(400).json({ error: 'invoiceId is required.' });
        }

        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('id, organization_id, total, client_name, client_email, invoice_number')
            .eq('id', invoiceId)
            .maybeSingle();
        if (invoiceError) {
            console.error('Failed to load invoice', invoiceError);
            return res.status(500).json({ error: 'Failed to load invoice.' });
        }
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }

        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, slug, currency, payment_config, name')
            .eq('id', invoice.organization_id)
            .maybeSingle();
        if (orgError) {
            console.error('Failed to load organization', orgError);
            return res.status(500).json({ error: 'Failed to load organization.' });
        }
        if (!org) {
            return res.status(404).json({ error: 'Organization not found.' });
        }

        const paymentConfig = org.payment_config || {};
        const payoutAccountId = paymentConfig.accountId;
        const paymentsEnabled = paymentConfig.enabled === true && payoutAccountId;
        if (!paymentsEnabled) {
            return res.status(400).json({ error: 'Payments are not enabled for this organization.' });
        }
        if (paymentConfig.provider && paymentConfig.provider !== 'flutterwave') {
            return res.status(400).json({ error: 'Flutterwave is not configured for this organization.' });
        }

        const feePercent = resolvePlatformFeePercent(paymentConfig.platformFeePercent);
        const txRef = `inv_${invoice.id}_${Date.now()}`;
        const redirectUrl = `${appBaseUrl}/catalog/${org.slug}/invoice/${invoice.id}`;

        const payload = {
            tx_ref: txRef,
            amount: invoice.total,
            currency: String(org.currency || 'USD').toUpperCase(),
            redirect_url: redirectUrl,
            customer: {
                email: invoice.client_email,
                name: invoice.client_name,
            },
            meta: {
                invoice_id: invoice.id,
                organization_id: org.id,
                platform_fee_percent: String(feePercent),
            },
            customizations: {
                title: `${org.name} Invoice`,
                description: `Invoice ${invoice.invoice_number}`,
            },
            // We removed the 'subaccounts' split to enable "Instant Payouts" via the Transfer API.
            // This allows us to push funds immediately after confirmation instead of waiting for T+1 settlement.
        };

        try {
            const response = await fetch('https://api.flutterwave.com/v3/payments', {
                method: 'POST',
                headers: await getFlutterwaveHeaders(),
                body: JSON.stringify(payload),
            });

            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
                console.error('Flutterwave initialize failed', data);
                return res.status(response.status).json({ error: data?.message || 'Flutterwave initialization failed.' });
            }
            const link = data?.data?.link;
            if (!link) {
                return res.status(500).json({ error: 'Flutterwave did not return a payment link.' });
            }
            return res.json({ link, reference: txRef });
        } catch (error) {
            console.error('Flutterwave initialize error', error);
            return res.status(500).json({ error: 'Failed to initialize Flutterwave payment.' });
        }
    }

    @Post('webhooks/flutterwave')
    async flutterwaveWebhook(@Req() req: Request, @Res() res: Response) {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase admin is not configured.' });
        }

        const signature = req.headers['verif-hash'];
        if (flutterwaveWebhookSecret && signature !== flutterwaveWebhookSecret) {
            return res.status(401).json({ error: 'Invalid webhook signature.' });
        }

        const payload = req.body || {};
        const event = payload.event;
        const data = payload.data || {};

        const isChargeCompleted = event === 'charge.completed' && data.status === 'successful';
        const isTransferEvent = event === 'transfer.completed';

        if (!isChargeCompleted && !isTransferEvent) {
            return res.json({ received: true });
        }

        const txRef = data?.tx_ref || data?.txRef || data?.reference || data?.flw_ref;
        const invoiceId = data?.meta?.invoice_id
            || data?.meta?.invoiceId
            || parseInvoiceIdFromRef(txRef);
        const organizationId = data?.meta?.organization_id || data?.meta?.organizationId;
        const billingType = data?.meta?.billing_type || data?.meta?.billingType;

        if (isChargeCompleted) {
            const isSubscriptionCharge = billingType === 'subscription'
                || String(txRef || '').startsWith('sub_');
            if (isSubscriptionCharge) {
                const accountId = data?.meta?.account_id || data?.meta?.accountId;
                const billingCycle = String(data?.meta?.billing_cycle || data?.meta?.billingCycle || 'monthly')
                    .trim()
                    .toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
                if (accountId) {
                    const { error: subscriptionError } = await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription: {
                                status: 'active',
                                billingCycle,
                                startedAt: new Date().toISOString(),
                            },
                        })
                        .eq('account_id', accountId);
                    if (subscriptionError) {
                        console.error('Failed to update subscription from webhook', subscriptionError);
                    }
                }
                return res.json({ received: true });
            }

            if (!invoiceId) {
                return res.json({ received: true });
            }
            const amount = Number.parseFloat(String(data.amount || '0'));
            const feePercent = resolvePlatformFeePercent(data?.meta?.platform_fee_percent || data?.meta?.platformFeePercent);
            const platformFeeAmount = Number.isFinite(amount)
                ? Math.round((amount * (feePercent / 100)) * 100) / 100
                : 0;
            const netAmount = Number.isFinite(amount) ? amount - platformFeeAmount : 0;
            const paymentId = data.id ? `flw_${data.id}` : `flw_${randomUUID()}`;

            const paymentRecord = {
                id: paymentId,
                invoice_id: invoiceId,
                amount: Number.isFinite(amount) ? amount : 0,
                currency: data.currency || null,
                status: data.status || null,
                provider: 'flutterwave',
                provider_reference: data.flw_ref || data.tx_ref || null,
                platform_fee_percent: feePercent,
                platform_fee_amount: platformFeeAmount,
                net_amount: netAmount,
                date: new Date().toISOString(),
                method: 'flutterwave',
            };

            const { error: paymentError } = await supabaseAdmin
                .from('payments')
                .upsert(paymentRecord, { onConflict: 'id' });
            if (paymentError) {
                console.error('Failed to record payment', paymentError);
            }

            if (invoiceId) {
                const { data: invoiceRow, error: invoiceRowError } = await supabaseAdmin
                    .from('invoices')
                    .select('id, organization_id, total, invoice_number')
                    .eq('id', invoiceId)
                    .maybeSingle();
                if (invoiceRowError) {
                    console.error('Failed to load invoice for payout', invoiceRowError);
                } else if (invoiceRow) {
                    const { data: orgRow, error: orgRowError } = await supabaseAdmin
                        .from('organizations')
                        .select('id, name, currency, payment_config')
                        .eq('id', invoiceRow.organization_id)
                        .maybeSingle();
                    if (orgRowError) {
                        console.error('Failed to load org for payout', orgRowError);
                    } else if (orgRow) {
                        const payoutCurrency = data.currency || orgRow.currency || 'USD';
                        await triggerInstantPayout({
                            org: orgRow,
                            invoice: invoiceRow,
                            amount: data.amount,
                            currency: payoutCurrency,
                            reference: data.tx_ref || data.flw_ref,
                        });
                    }
                }
            }

            const { error: invoiceError } = await supabaseAdmin
                .from('invoices')
                .update({ status: 'PAID' })
                .eq('id', invoiceId);
            if (invoiceError) {
                console.error('Failed to update invoice status', invoiceError);
            }
        }

        if (isTransferEvent) {
            const transferStatus = String(data.status || '').toUpperCase();
            const normalizedStatus = transferStatus === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'FAILED';
            let resolvedOrgId = organizationId;
            let resolvedInvoiceId = invoiceId;

            if (!resolvedOrgId && resolvedInvoiceId) {
                const { data: invoiceRow } = await supabaseAdmin
                    .from('invoices')
                    .select('organization_id')
                    .eq('id', resolvedInvoiceId)
                    .maybeSingle();
                if (invoiceRow?.organization_id) {
                    resolvedOrgId = invoiceRow.organization_id;
                }
            }

            if (resolvedOrgId) {
                let resolvedInvoiceNumber = data?.meta?.invoice_number;
                if (!resolvedInvoiceNumber && resolvedInvoiceId) {
                    const { data: invoiceRow } = await supabaseAdmin
                        .from('invoices')
                        .select('invoice_number')
                        .eq('id', resolvedInvoiceId)
                        .maybeSingle();
                    resolvedInvoiceNumber = invoiceRow?.invoice_number;
                }
                await createAgentLog({
                    organizationId: resolvedOrgId,
                    action: normalizedStatus === 'SUCCESSFUL' ? 'PAYOUT_COMPLETED' : 'PAYOUT_FAILED',
                    details: JSON.stringify({
                        provider: 'flutterwave',
                        method: data?.meta?.payout_method || 'momo',
                        status: transferStatus || normalizedStatus,
                        transferId: data?.id,
                        reference: data?.reference,
                        invoiceNumber: resolvedInvoiceNumber,
                    }),
                    relatedId: resolvedInvoiceId || null,
                    type: normalizedStatus === 'SUCCESSFUL' ? 'SUCCESS' : 'WARNING',
                });
            }
        }

        return res.json({ received: true });
    }

    @Post('ai/generate')
    async generateAi(@Body() dto: AiGenerateDto, @Res() res: Response) {
        if (!geminiApiKey) {
            return res.status(500).json({ error: 'Gemini API key is not configured.' });
        }

        const { prompt, schema } = dto;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
            const body = {
                contents: [{ parts: [{ text: prompt }] }],
                ...(schema
                    ? {
                        generationConfig: {
                            responseMimeType: 'application/json',
                            responseSchema: schema,
                        },
                    }
                    : {}),
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errData: any = await response.json().catch(() => ({}));
                return res.status(response.status).json({
                    error: errData.error?.message || 'Gemini API request failed.',
                });
            }

            const data: any = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                return res.status(500).json({ error: 'No content generated.' });
            }

            return res.json({ text });
        } catch (error) {
            console.error('Gemini API error:', error);
            return res.status(500).json({ error: 'Gemini API request failed.' });
        }
    }

    @Post('translate')
    async translate(@Body() dto: TranslateDto, @Res() res: Response) {
        const { texts, targetLanguage, sourceLanguage } = dto;

        const translateWithGoogle = async (): Promise<string[] | null> => {
            if (!googleTranslateApiKey) return null;
            const target = resolveGoogleLanguageCode(targetLanguage, 'en');
            const source = sourceLanguage ? resolveGoogleLanguageCode(sourceLanguage, '') : '';
            const payload = {
                q: texts.map((text: string) => String(text)),
                target,
                format: 'text',
                ...(source ? { source } : {}),
            };

            try {
                const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    console.warn('Google Translate response not ok:', response.status);
                    return null;
                }

                const data: any = await response.json();
                const translations = Array.isArray(data?.data?.translations)
                    ? data.data.translations.map((item: any) => item.translatedText || '')
                    : [];

                if (translations.length === texts.length) {
                    return translations;
                }
                return null;
            } catch (error) {
                console.warn('Google Translate API error, falling back to Gemini:', error);
                return null;
            }
        };

        const translateWithGemini = async (): Promise<string[] | null> => {
            if (!geminiApiKey) return null;
            const srcLang = sourceLanguage || 'English';
            const prompt = `Translate the following texts from ${srcLang} to ${targetLanguage}. Return ONLY a JSON array of translated strings, maintaining the exact same order and count as the input. Do not include any explanation or markdown formatting.

Input texts:
${JSON.stringify(texts)}

Output (JSON array only):`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1 },
                    }),
                });

                if (!response.ok) {
                    console.warn('Gemini translation response not ok:', response.status);
                    return null;
                }

                const data: any = await response.json();
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = rawText.match(/\[[\s\S]*\]/);
                if (!jsonMatch) return null;

                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length === texts.length) {
                    return parsed.map((item: any) => String(item));
                }
                return null;
            } catch (error) {
                console.error('Gemini translation error:', error);
                return null;
            }
        };

        let translations = await translateWithGoogle();
        if (!translations) {
            translations = await translateWithGemini();
        }

        if (!translations || translations.length !== texts.length) {
            return res.status(500).json({ error: 'Translation failed. Please try again.' });
        }

        return res.json({ translations });
    }

    @Get('auth/google/start')
    startGoogleAuth(@Req() req: Request, @Res() res: Response) {
        if (!googleClientId || !googleRedirectUri) {
            return res.status(500).json({ error: 'Google SSO is not configured.' });
        }
        const redirectPath = sanitizeRedirectPath(req.query.redirect);
        const statePayload = {
            redirectPath,
            ts: Date.now(),
        };
        const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', googleClientId);
        authUrl.searchParams.set('redirect_uri', googleRedirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state);
        return res.redirect(authUrl.toString());
    }

    @Get('auth/google/callback')
    async googleCallback(@Req() req: Request, @Res() res: Response) {
        const { code, state, error } = req.query;
        const fallbackRedirect = '/onboarding';
        let redirectPath = fallbackRedirect;

        if (state) {
            try {
                const parsed = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
                redirectPath = sanitizeRedirectPath(parsed.redirectPath);
            } catch (parseError) {
                console.warn('Failed to parse OAuth state', parseError);
            }
        }

        if (error) {
            return res.redirect(buildAppRedirect(redirectPath, { oauthError: String(error) }));
        }
        if (!code) {
            return res.redirect(buildAppRedirect(redirectPath, { oauthError: 'missing_code' }));
        }
        if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
            return res.redirect(buildAppRedirect(redirectPath, { oauthError: 'config_error' }));
        }

        try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code: String(code),
                    client_id: googleClientId,
                    client_secret: googleClientSecret,
                    redirect_uri: googleRedirectUri,
                    grant_type: 'authorization_code',
                }),
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                console.error('Google token exchange failed:', errorText);
                return res.redirect(buildAppRedirect(redirectPath, { oauthError: 'token_exchange_failed' }));
            }

            const tokenData: any = await tokenResponse.json();
            const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });

            if (!profileResponse.ok) {
                const errorText = await profileResponse.text();
                console.error('Google userinfo failed:', errorText);
                return res.redirect(buildAppRedirect(redirectPath, { oauthError: 'profile_fetch_failed' }));
            }

            const profile: any = await profileResponse.json();
            return res.redirect(buildAppRedirect(redirectPath, {
                sso: 'google',
                email: profile.email || '',
                name: profile.name || '',
                picture: profile.picture || '',
            }));
        } catch (error) {
            console.error('Google OAuth failed:', error);
            return res.redirect(buildAppRedirect(redirectPath, { oauthError: 'oauth_failed' }));
        }
    }
}
