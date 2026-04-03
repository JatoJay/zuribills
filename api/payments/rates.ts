import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const from = ((req.query.from as string) || 'USD').toUpperCase();
    const to = ((req.query.to as string) || 'USD').toUpperCase();
    const amount = Number(req.query.amount) || 1;

    if (from === to) {
        return res.status(200).json({ rate: 1, converted: amount, source: 'same_currency' });
    }

    try {
        const response = await fetch(
            `https://open.er-api.com/v6/latest/${from}`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (response.ok) {
            const data = await response.json();
            const rate = data.rates?.[to];

            if (rate) {
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
        console.warn('Failed to fetch live rates:', error);
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
