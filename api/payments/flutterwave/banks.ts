import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth, checkRateLimit, COUNTRY_REGEX } from '../../_lib/security';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

const BANKS_TTL_MS = 6 * 60 * 60 * 1000;
const banksCache = new Map<string, { banks: Array<{ code: string; name: string }>; expiresAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'flw-banks', 30, 60_000)) return;

    const user = await requireAuth(req, res);
    if (!user) return;

    const country = ((req.query.country as string) || 'NG').toUpperCase();
    if (!COUNTRY_REGEX.test(country)) {
        return res.status(400).json({ error: 'Invalid country code' });
    }

    if (!FLW_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    const now = Date.now();
    const cached = banksCache.get(country);
    if (cached && cached.expiresAt > now) {
        return res.status(200).json({ success: true, banks: cached.banks, cached: true });
    }

    try {
        const response = await fetch(`https://api.flutterwave.com/v3/banks/${encodeURIComponent(country)}`, {
            headers: {
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
            signal: AbortSignal.timeout(10_000),
        });

        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            console.error('Flutterwave banks error');
            return res.status(400).json({ error: 'Failed to fetch banks' });
        }

        const banks = (data.data || []).map((bank: any) => ({
            code: String(bank.code || '').slice(0, 16),
            name: String(bank.name || '').slice(0, 128),
        }));

        banksCache.set(country, { banks, expiresAt: now + BANKS_TTL_MS });

        return res.status(200).json({ success: true, banks });
    } catch (error: any) {
        console.error('Flutterwave banks error');
        return res.status(500).json({ error: 'Failed to fetch banks' });
    }
}
