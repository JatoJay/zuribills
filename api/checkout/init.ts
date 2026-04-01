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

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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

    const { i, a, c, z, n, d, o, oid } = decoded;

    if (!i || !a || !c || !z) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!POLAR_ACCESS_TOKEN || !POLAR_ORG_ID) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const reference = `INV-${i}-${Date.now()}`;
        let amountInCents = Math.round(Number(a) * 100);
        const checkoutCurrency = 'usd';

        const originalCurrency = c.toLowerCase();
        if (originalCurrency !== 'usd') {
            let rate = 1;
            try {
                const rateResponse = await fetch(
                    `https://open.er-api.com/v6/latest/${originalCurrency.toUpperCase()}`,
                    { signal: AbortSignal.timeout(5000) }
                );
                if (rateResponse.ok) {
                    const rateData = await rateResponse.json();
                    rate = rateData.rates?.USD || 1;
                }
            } catch (rateError) {
                console.warn('Failed to fetch live rate, using fallback:', rateError);
                const fallbackRates: Record<string, number> = {
                    eur: 1.08, gbp: 1.27, cad: 0.74, aud: 0.65,
                    ngn: 0.00063, ghs: 0.063, kes: 0.0065, zar: 0.053,
                };
                rate = fallbackRates[originalCurrency] || 1;
            }
            amountInCents = Math.round(amountInCents * rate);
        }

        const orgSlug = o || '';
        const successUrl = orgSlug
            ? `${APP_BASE_URL}/catalog/${orgSlug}/success/${i}?reference=${reference}`
            : `${APP_BASE_URL}/catalog/success/${i}?reference=${reference}`;

        const payload = {
            organization_id: POLAR_ORG_ID,
            amount: amountInCents,
            currency: checkoutCurrency,
            customer_email: z,
            customer_name: n || 'Customer',
            success_url: successUrl,
            metadata: {
                invoice_id: i,
                organization_id: oid || '',
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
