import type { VercelRequest, VercelResponse } from '@vercel/node';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const country = (req.query.country as string || 'NG').toUpperCase();

    if (!FLW_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const response = await fetch(`https://api.flutterwave.com/v3/banks/${country}`, {
            headers: {
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
        });

        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
            console.error('Flutterwave banks error:', data);
            return res.status(400).json({ error: data.message || 'Failed to fetch banks' });
        }

        const banks = (data.data || []).map((bank: any) => ({
            code: bank.code,
            name: bank.name,
        }));

        return res.status(200).json({ success: true, banks });
    } catch (error: any) {
        console.error('Flutterwave banks error:', error);
        return res.status(500).json({ error: 'Failed to fetch banks' });
    }
}
