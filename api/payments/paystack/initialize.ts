import type { VercelRequest, VercelResponse } from '@vercel/node';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

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

    const { invoiceId, amount, currency, email, name, description } = req.body || {};

    if (!invoiceId || !amount || !currency || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const reference = `INV-${invoiceId}-${Date.now()}`;
        const amountInKobo = Math.round(Number(amount) * 100);

        const payload = {
            email,
            amount: amountInKobo,
            currency: currency.toUpperCase(),
            reference,
            callback_url: `${APP_BASE_URL}/catalog/success/${invoiceId}`,
            metadata: {
                invoice_id: invoiceId,
                customer_name: name || 'Customer',
                description: description || `Payment for Invoice ${invoiceId}`,
            },
        };

        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            console.error('Paystack error:', data);
            return res.status(400).json({
                error: data.message || 'Failed to initialize payment'
            });
        }

        return res.status(200).json({
            success: true,
            reference: data.data?.reference || reference,
            authorization_url: data.data?.authorization_url,
            access_code: data.data?.access_code,
        });
    } catch (error: any) {
        console.error('Paystack initialization error:', error);
        return res.status(500).json({ error: 'Payment service error' });
    }
}
