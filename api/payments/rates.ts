import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, checkRateLimit, CURRENCY_REGEX } from '../_lib/security';

const FALLBACK_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.53,
    NGN: 1550,
    GHS: 15.5,
    KES: 129,
    ZAR: 18.2,
    RWF: 1350,
};

const RATE_TTL_MS = 10 * 60 * 1000;
const ratesCache = new Map<string, { rates: Record<string, number>; expiresAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'rates', 60, 60_000)) return;

    const from = ((req.query.from as string) || 'USD').toUpperCase();
    const to = ((req.query.to as string) || 'USD').toUpperCase();
    const amountRaw = Number(req.query.amount);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 && amountRaw <= 1_000_000_000
        ? amountRaw
        : 1;

    if (!CURRENCY_REGEX.test(from) || !CURRENCY_REGEX.test(to)) {
        return res.status(400).json({ error: 'Invalid currency code' });
    }

    if (from === to) {
        return res.status(200).json({ rate: 1, converted: amount, source: 'same_currency' });
    }

    const now = Date.now();
    const cached = ratesCache.get(from);
    if (cached && cached.expiresAt > now) {
        const rate = cached.rates[to];
        if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
            return res.status(200).json({
                rate,
                converted: amount * rate,
                source: 'cached',
                from,
                to,
            });
        }
    }

    try {
        const response = await fetch(
            `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (response.ok) {
            const data = await response.json();
            const rates = data?.rates;
            if (rates && typeof rates === 'object') {
                ratesCache.set(from, { rates, expiresAt: now + RATE_TTL_MS });
            }
            const rate = rates?.[to];

            if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && rate < 1_000_000) {
                return res.status(200).json({
                    rate,
                    converted: amount * rate,
                    source: 'live',
                    from,
                    to,
                });
            }
        }
    } catch (error) {
        console.warn('Failed to fetch live rates');
    }

    const fromRate = FALLBACK_RATES[from] || 1;
    const toRate = FALLBACK_RATES[to] || 1;
    const rate = toRate / fromRate;

    return res.status(200).json({
        rate,
        converted: amount * rate,
        source: 'fallback',
        from,
        to,
    });
}
