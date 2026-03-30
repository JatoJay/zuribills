import type { VercelRequest, VercelResponse } from '@vercel/node';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log('Polar initialize handler called, method:', req.method);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', receivedMethod: req.method });
    }

    const { invoiceId, amount, curr, buyer, name, description } = req.body || {};

    if (!invoiceId || !amount || !curr || !buyer) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!POLAR_ACCESS_TOKEN || !POLAR_ORG_ID) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const reference = `INV-${invoiceId}-${Date.now()}`;
        const amountInCents = Math.round(Number(amount) * 100);

        const payload = {
            organization_id: POLAR_ORG_ID,
            amount: amountInCents,
            currency: curr.toLowerCase(),
            customer_email: buyer,
            customer_name: name || 'Customer',
            success_url: `${APP_BASE_URL}/catalog/success/${invoiceId}?reference=${reference}`,
            metadata: {
                invoice_id: invoiceId,
                reference,
                description: description || `Payment for Invoice ${invoiceId}`,
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

        const data = await response.json();

        if (!response.ok) {
            console.error('Polar error:', data);
            return res.status(400).json({
                error: data.detail || data.message || 'Failed to initialize payment'
            });
        }

        return res.status(200).json({
            success: true,
            reference,
            checkout_url: data.url,
            checkout_id: data.id,
        });
    } catch (error: any) {
        console.error('Polar initialization error:', error);
        return res.status(500).json({ error: 'Payment service error' });
    }
}
