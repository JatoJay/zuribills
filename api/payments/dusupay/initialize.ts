import type { VercelRequest, VercelResponse } from '@vercel/node';

const DUSUPAY_API_URL = 'https://api.dusupay.com/v1';
const DUSUPAY_PUBLIC_KEY = process.env.DUSUPAY_PUBLIC_KEY;
const DUSUPAY_SECRET_KEY = process.env.DUSUPAY_SECRET_KEY;
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

    const { invoiceId, amount, currency, email, name, phone, description } = req.body || {};

    if (!invoiceId || !amount || !currency || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!DUSUPAY_PUBLIC_KEY || !DUSUPAY_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const reference = `INV-${invoiceId}-${Date.now()}`;

        const payload = {
            api_key: DUSUPAY_PUBLIC_KEY,
            currency: currency.toUpperCase(),
            amount: Number(amount),
            method: 'MOBILE_MONEY',
            provider_id: 'mtn_ug',
            merchant_reference: reference,
            redirect_url: `${APP_BASE_URL}/catalog/success/${invoiceId}`,
            webhook_url: `${APP_BASE_URL}/api/webhooks/dusupay`,
            narration: description || `Payment for Invoice ${invoiceId}`,
            email: email,
            mobile_money_phone: phone || '',
            customer_name: name || 'Customer',
        };

        const response = await fetch(`${DUSUPAY_API_URL}/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'secret-key': DUSUPAY_SECRET_KEY,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data.status !== 200) {
            console.error('DusuPay error:', data);
            return res.status(400).json({
                error: data.message || 'Failed to initialize payment'
            });
        }

        return res.status(200).json({
            success: true,
            reference: data.data?.internal_reference || reference,
            payment_url: data.data?.payment_url,
            redirect_url: data.data?.payment_url,
        });
    } catch (error: any) {
        console.error('DusuPay initialization error:', error);
        return res.status(500).json({ error: 'Payment service error' });
    }
}
