import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const replyTo = process.env.RESEND_REPLY_TO;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8787/api/auth/google/callback';
const appBaseUrl = process.env.VITE_APP_BASE_URL || 'http://localhost:3004';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
const flutterwaveWebhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
const platformFeePercent = Number.parseFloat(process.env.PLATFORM_FEE_PERCENT || '1.5');

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

const resolvePlatformFeePercent = (value) => {
    const parsed = Number.parseFloat(String(value ?? ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
    }
    return Number.isFinite(platformFeePercent) ? platformFeePercent : 1.5;
};

const escapeHtml = (input = '') =>
    input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const buildHtmlBody = (text) => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return '';
    return `
        <div style="font-family: Arial, sans-serif; color: #0b0b0b; line-height: 1.6;">
            ${lines.map((line) => `<p style="margin: 0 0 12px;">${escapeHtml(line)}</p>`).join('')}
        </div>
    `;
};

const getBearerToken = (req) => {
    const header = req.headers.authorization || '';
    if (!header) return null;
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) return null;
    return token;
};

const getAuthenticatedUser = async (req) => {
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

const parseInvoiceIdFromRef = (ref) => {
    if (!ref) return null;
    const match = String(ref).match(/^inv_([^_]+)_/);
    return match ? match[1] : null;
};

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/email/send-invoice', async (req, res) => {
    if (!resend || !resendApiKey) {
        return res.status(500).json({ error: 'RESEND_API_KEY is not configured.' });
    }
    if (!fromEmail) {
        return res.status(500).json({ error: 'RESEND_FROM_EMAIL is not configured.' });
    }

    const { to, subject, body, invoiceNumber, clientName } = req.body || {};

    if (!to) {
        return res.status(400).json({ error: 'Recipient email is required.' });
    }

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
            reply_to: replyTo || undefined,
        });

        return res.json({ id: result.data?.id });
    } catch (error) {
        console.error('Resend send failed:', error);
        return res.status(500).json({ error: 'Failed to send email.' });
    }
});

app.get('/api/payments/flutterwave/banks', async (req, res) => {
    if (!flutterwaveSecretKey) {
        return res.status(500).json({ error: 'FLUTTERWAVE_SECRET_KEY is not configured.' });
    }

    const { error: authError } = await getAuthenticatedUser(req);
    if (authError) {
        return res.status(401).json({ error: authError });
    }

    const country = String(req.query.country || 'NG').toUpperCase();

    try {
        const response = await fetch(`https://api.flutterwave.com/v3/banks/${country}`, {
            headers: {
                Authorization: `Bearer ${flutterwaveSecretKey}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error('Flutterwave bank list failed', data);
            return res.status(response.status).json({ error: data?.message || 'Failed to load banks.' });
        }
        const banks = (data?.data || [])
            .map((bank) => ({
                code: String(bank.code ?? bank.id ?? ''),
                name: bank.name || bank.bank_name || '',
            }))
            .filter((bank) => bank.code && bank.name);

        return res.json({ banks });
    } catch (error) {
        console.error('Flutterwave bank list error', error);
        return res.status(500).json({ error: 'Failed to load banks.' });
    }
});

app.post('/api/payments/flutterwave/payouts', async (req, res) => {
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

    const {
        orgId,
        bankCode,
        bankName,
        accountNumber,
        accountName,
        bankCountry,
    } = req.body || {};

    const bankCodeValue = String(bankCode || '').trim();
    const accountNumberValue = String(accountNumber || '').trim();

    if (!orgId) {
        return res.status(400).json({ error: 'orgId is required.' });
    }
    if (!bankCodeValue || !accountNumberValue) {
        return res.status(400).json({ error: 'Bank code and account number are required.' });
    }

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

    const { data: userRow, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, account_id, email, name')
        .eq('id', user.id)
        .maybeSingle();
    if (userError) {
        console.error('Failed to load user', userError);
        return res.status(500).json({ error: 'Failed to load user.' });
    }
    if (!userRow || userRow.account_id !== org.account_id) {
        return res.status(403).json({ error: 'Not authorized to update this organization.' });
    }

    const country = String(bankCountry || 'NG').toUpperCase();
    const feePercent = resolvePlatformFeePercent(org.payment_config?.platformFeePercent);

    const payload = {
        account_bank: bankCodeValue,
        account_number: accountNumberValue,
        business_name: org.name,
        business_email: org.contact_email || user.email,
        business_contact: userRow.name || org.name,
        business_contact_mobile: org.contact_phone || undefined,
        country,
        split_type: 'percentage',
        split_value: 100,
        meta: {
            org_id: org.id,
            platform_fee_percent: String(feePercent),
        },
    };

    try {
        const response = await fetch('https://api.flutterwave.com/v3/subaccounts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flutterwaveSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error('Flutterwave subaccount failed', data);
            return res.status(response.status).json({ error: data?.message || 'Failed to create payout account.' });
        }

        const subaccount = data?.data || {};
        const subaccountId = subaccount.id || subaccount.subaccount_id || subaccount.account_id;
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
            accountName: accountName || subaccount.account_name || null,
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
});

app.post('/api/payments/flutterwave/initialize', async (req, res) => {
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
        subaccounts: [
            {
                id: payoutAccountId,
                transaction_charge_type: 'percentage',
                transaction_charge: feePercent,
            },
        ],
    };

    try {
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flutterwaveSecretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
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
});

app.post('/api/webhooks/flutterwave', async (req, res) => {
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
    const isTransferCompleted = event === 'transfer.completed'
        && ['successful', 'SUCCESSFUL', 'success'].includes(String(data.status || ''));

    if (!isChargeCompleted && !isTransferCompleted) {
        return res.json({ received: true });
    }

    const invoiceId = data?.meta?.invoice_id
        || data?.meta?.invoiceId
        || parseInvoiceIdFromRef(data?.tx_ref || data?.txRef || data?.reference || data?.flw_ref);
    if (!invoiceId) {
        return res.json({ received: true });
    }

    if (isChargeCompleted) {
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
    }

    const { error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'PAID' })
        .eq('id', invoiceId);
    if (invoiceError) {
        console.error('Failed to update invoice status', invoiceError);
    }

    return res.json({ received: true });
});

app.post('/api/ai/generate', async (req, res) => {
    if (!geminiApiKey) {
        return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const { prompt, schema } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

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
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: errData.error?.message || 'Gemini API request failed.',
            });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return res.status(500).json({ error: 'No content generated.' });
        }

        return res.json({ text });
    } catch (error) {
        console.error('Gemini API error:', error);
        return res.status(500).json({ error: 'Gemini API request failed.' });
    }
});

const sanitizeRedirectPath = (redirectPath) => {
    if (typeof redirectPath !== 'string' || !redirectPath.startsWith('/')) {
        return '/onboarding';
    }
    return redirectPath;
};

const buildAppRedirect = (redirectPath, params) => {
    const targetUrl = new URL(redirectPath, appBaseUrl);
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value) {
            targetUrl.searchParams.set(key, value);
        }
    });
    return targetUrl.toString();
};

app.get('/api/auth/google/start', (req, res) => {
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
    res.redirect(authUrl.toString());
});

app.get('/api/auth/google/callback', async (req, res) => {
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

        const tokenData = await tokenResponse.json();
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!profileResponse.ok) {
            const errorText = await profileResponse.text();
            console.error('Google userinfo failed:', errorText);
            return res.redirect(buildAppRedirect(redirectPath, { oauthError: 'profile_fetch_failed' }));
        }

        const profile = await profileResponse.json();
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
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
    console.log(`[email-api] listening on ${port}`);
});
