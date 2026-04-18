import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, checkRateLimit, ID_REGEX } from '../../_lib/security';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const CHECKOUT_ID_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'polar-status', 60, 60_000)) return;

    const checkout_id = req.query.checkout_id;
    if (typeof checkout_id !== 'string' || !CHECKOUT_ID_REGEX.test(checkout_id) || !ID_REGEX.test(checkout_id)) {
        return res.status(400).json({ error: 'Invalid checkout_id' });
    }

    if (!POLAR_ACCESS_TOKEN) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const response = await fetch(`https://api.polar.sh/v1/checkouts/custom/${encodeURIComponent(checkout_id)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            },
            signal: AbortSignal.timeout(10_000),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(400).json({ error: 'Failed to check payment status' });
        }

        let status = 'PENDING';
        if (data.status === 'succeeded') {
            status = 'SUCCESS';
        } else if (data.status === 'failed' || data.status === 'expired') {
            status = 'FAILED';
        }

        return res.status(200).json({
            status,
            checkout_id: data.id,
            amount: data.amount,
            currency: data.currency,
        });
    } catch (error: any) {
        console.error('Polar status check error');
        return res.status(500).json({ error: 'Payment service error' });
    }
}
