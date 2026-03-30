import type { VercelRequest, VercelResponse } from '@vercel/node';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Data');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const dataHeader = req.headers['x-data'] as string;
    const dataQuery = req.query.d as string;
    const data = dataHeader || dataQuery || '';

    if (!data) {
        return res.status(400).json({ error: 'Missing data' });
    }

    let decoded;
    try {
        const hexDecoded = Buffer.from(data, 'hex').toString('utf-8');
        decoded = JSON.parse(hexDecoded);
    } catch {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const { i, a, c, z, n, d } = decoded;

    if (!i || !a || !c || !z) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!POLAR_ACCESS_TOKEN || !POLAR_ORG_ID) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const reference = `INV-${i}-${Date.now()}`;
        const amountInCents = Math.round(Number(a) * 100);

        const payload = {
            organization_id: POLAR_ORG_ID,
            amount: amountInCents,
            currency: c.toLowerCase(),
            customer_email: z,
            customer_name: n || 'Customer',
            success_url: `${APP_BASE_URL}/catalog/success/${i}?reference=${reference}`,
            metadata: {
                invoice_id: i,
                reference,
                description: d || `Payment for Invoice ${i}`,
            },
        };

        const response = await fetch('https://api.polar.sh/v1/checkouts/custom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Polar error:', responseData);
            return res.status(400).json({
                error: responseData.detail || responseData.message || 'Failed to initialize payment'
            });
        }

        return res.status(200).json({
            success: true,
            reference,
            checkout_url: responseData.url,
            checkout_id: responseData.id,
        });
    } catch (error: any) {
        console.error('Polar initialization error:', error);
        return res.status(500).json({ error: 'Payment service error' });
    }
}
