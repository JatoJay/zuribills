import type { VercelRequest, VercelResponse } from '@vercel/node';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

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

    const { checkout_id } = req.query;

    if (!checkout_id) {
        return res.status(400).json({ error: 'Missing checkout_id' });
    }

    if (!POLAR_ACCESS_TOKEN) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const response = await fetch(`https://api.polar.sh/v1/checkouts/custom/${checkout_id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(400).json({ error: data.detail || 'Failed to check payment status' });
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
        console.error('Polar status check error:', error);
        return res.status(500).json({ error: 'Payment service error' });
    }
}
