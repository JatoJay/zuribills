import type { VercelRequest, VercelResponse } from '@vercel/node';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
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

    const { i: invoiceId, a: amount, c: currency, z: customerEmail, n: customerName, d: description, o: orgSlug, oid: organizationId } = decoded;

    if (!invoiceId || !amount || !currency || !customerEmail) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!FLW_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const reference = `ZB-${invoiceId}-${Date.now()}`;

        const payload = {
            tx_ref: reference,
            amount: Number(amount),
            currency: currency.toUpperCase(),
            redirect_url: `${APP_BASE_URL}/catalog/${orgSlug}/success/${invoiceId}?reference=${reference}`,
            customer: {
                email: customerEmail,
                name: customerName || 'Customer',
            },
            customizations: {
                title: 'ZuriBills Payment',
                description: description || `Payment for Invoice ${invoiceId}`,
                logo: `${APP_BASE_URL}/logo.svg`,
            },
            meta: {
                invoice_id: invoiceId,
                organization_id: organizationId || '',
                reference,
                org_slug: orgSlug,
            },
        };

        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.status !== 'success') {
            console.error('Flutterwave error:', responseData);
            return res.status(400).json({
                error: responseData.message || 'Failed to initialize payment'
            });
        }

        return res.status(200).json({
            success: true,
            reference,
            checkout_url: responseData.data?.link,
            provider: 'flutterwave',
        });
    } catch (error: any) {
        console.error('Flutterwave initialization error:', error);
        return res.status(500).json({ error: 'Payment service error' });
    }
}
