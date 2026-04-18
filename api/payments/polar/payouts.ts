import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireOrgAdmin, ID_REGEX, COUNTRY_REGEX } from '../../_lib/security';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseFetch = async (path: string, options: RequestInit = {}) => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error('Supabase not configured');
    }
    const url = `${SUPABASE_URL}/rest/v1${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation',
            ...options.headers,
        },
        signal: AbortSignal.timeout(10_000),
    });
    return response;
};

const ACCOUNT_NUMBER_REGEX = /^[A-Za-z0-9-]{4,32}$/;
const ACCOUNT_NAME_REGEX = /^[A-Za-z0-9 .,'\-&()]{1,128}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Database not configured' });
    }

    const { orgId, accountNumber, accountName, bankCountry } = req.body || {};

    if (!orgId || typeof orgId !== 'string' || !ID_REGEX.test(orgId)) {
        return res.status(400).json({ error: 'Invalid orgId' });
    }
    if (!accountNumber || typeof accountNumber !== 'string' || !ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
        return res.status(400).json({ error: 'Invalid accountNumber' });
    }
    if (!accountName || typeof accountName !== 'string' || !ACCOUNT_NAME_REGEX.test(accountName)) {
        return res.status(400).json({ error: 'Invalid accountName' });
    }
    const country = bankCountry || 'US';
    if (typeof country !== 'string' || !COUNTRY_REGEX.test(country.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid bankCountry' });
    }

    const user = await requireOrgAdmin(req, res, orgId);
    if (!user) return;

    try {
        const paymentConfig = {
            provider: 'polar',
            accountNumber,
            accountName,
            bankCountry: country.toUpperCase(),
            connectedAt: new Date().toISOString(),
        };

        const response = await supabaseFetch(`/organizations?id=eq.${encodeURIComponent(orgId)}`, {
            method: 'PATCH',
            body: JSON.stringify({
                payment_config: paymentConfig,
            }),
        });

        if (!response.ok) {
            console.error('Failed to update organization payment config');
            return res.status(400).json({ error: 'Failed to save payout account' });
        }

        return res.status(200).json({
            success: true,
            accountId: `polar_${orgId}`,
            bankCountry: country.toUpperCase(),
            accountName,
            accountNumberLast4: accountNumber.slice(-4),
        });
    } catch (error: any) {
        console.error('Payout account error:', error);
        return res.status(500).json({ error: 'Failed to connect payout account' });
    }
}
