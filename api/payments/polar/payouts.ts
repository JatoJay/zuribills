import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    });
    return response;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    const { orgId, accountNumber, accountName, bankCountry } = req.body;

    if (!orgId || !accountNumber || !accountName) {
        return res.status(400).json({ error: 'Missing required fields: orgId, accountNumber, accountName' });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Database not configured' });
    }

    try {
        const paymentConfig = {
            provider: 'polar',
            accountNumber,
            accountName,
            bankCountry: bankCountry || 'US',
            connectedAt: new Date().toISOString(),
        };

        const response = await supabaseFetch(`/organizations?id=eq.${orgId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                payment_config: paymentConfig,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to update organization:', errorText);
            return res.status(400).json({ error: 'Failed to save payout account' });
        }

        return res.status(200).json({
            success: true,
            accountId: `polar_${orgId}`,
            bankCountry: bankCountry || 'US',
            accountName,
            accountNumberLast4: accountNumber.slice(-4),
        });
    } catch (error: any) {
        console.error('Payout account error:', error);
        return res.status(500).json({ error: 'Failed to connect payout account' });
    }
}
