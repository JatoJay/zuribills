import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    applyCors,
    SLUG_REGEX,
    EMAIL_REGEX,
    CURRENCY_REGEX,
    getInvoiceById,
    getOrganizationById,
    checkRateLimit,
} from '../_lib/security';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_ORG_ID = process.env.POLAR_ORG_ID;
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

const FALLBACK_RATES: Record<string, number> = {
    EUR: 1.08, GBP: 1.27, CAD: 0.74, AUD: 0.65,
    NGN: 0.00063, GHS: 0.063, KES: 0.0065, ZAR: 0.053, RWF: 0.00074,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'polar-init', 30, 60_000)) return;

    const dataHeader = req.headers['x-data'] as string;
    const dataQuery = req.query.d as string;
    const data = dataHeader || dataQuery || '';

    if (!data || data.length > 8192) {
        return res.status(400).json({ error: 'Missing or oversized data' });
    }

    let decoded: any;
    try {
        const hexDecoded = Buffer.from(data, 'hex').toString('utf-8');
        decoded = JSON.parse(hexDecoded);
    } catch {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const { i: invoiceId, z: customerEmail, n: customerName, d: description, o: orgSlug } = decoded;

    if (!invoiceId || typeof invoiceId !== 'string') {
        return res.status(400).json({ error: 'Missing invoiceId' });
    }
    if (!customerEmail || typeof customerEmail !== 'string' || !EMAIL_REGEX.test(customerEmail) || customerEmail.length > 254) {
        return res.status(400).json({ error: 'Invalid customer email' });
    }
    if (orgSlug && (typeof orgSlug !== 'string' || !SLUG_REGEX.test(orgSlug))) {
        return res.status(400).json({ error: 'Invalid orgSlug' });
    }

    if (!POLAR_ACCESS_TOKEN || !POLAR_ORG_ID) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    if (invoice.status === 'PAID' || invoice.status === 'REFUNDED' || invoice.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Invoice is not payable' });
    }

    const org = await getOrganizationById(invoice.organization_id);
    if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
    }

    const amount = Number(invoice.total);
    const originalCurrency = String(invoice.currency || org.currency || 'USD').toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
        return res.status(400).json({ error: 'Invalid invoice total' });
    }
    if (!CURRENCY_REGEX.test(originalCurrency)) {
        return res.status(400).json({ error: 'Invalid currency' });
    }

    try {
        const reference = `INV-${invoiceId}-${Date.now()}`;
        let amountInCents = Math.round(amount * 100);
        const checkoutCurrency = 'usd';

        if (originalCurrency !== 'USD') {
            let rate = 1;
            try {
                const rateResponse = await fetch(
                    `https://open.er-api.com/v6/latest/${originalCurrency}`,
                    { signal: AbortSignal.timeout(5000) }
                );
                if (rateResponse.ok) {
                    const rateData = await rateResponse.json();
                    const liveRate = rateData.rates?.USD;
                    if (typeof liveRate === 'number' && liveRate > 0 && liveRate < 1000) {
                        rate = liveRate;
                    } else {
                        rate = FALLBACK_RATES[originalCurrency] || 1;
                    }
                } else {
                    rate = FALLBACK_RATES[originalCurrency] || 1;
                }
            } catch {
                rate = FALLBACK_RATES[originalCurrency] || 1;
            }
            amountInCents = Math.round(amountInCents * rate);
        }

        if (amountInCents <= 0 || amountInCents > 100_000_000) {
            return res.status(400).json({ error: 'Invalid amount after conversion' });
        }

        const safeOrgSlug = orgSlug || org.slug || '';
        const safeCustomerName = String(customerName || 'Customer').replace(/[\r\n]+/g, ' ').slice(0, 128);
        const safeDescription = String(description || `Payment for Invoice ${invoiceId}`).replace(/[\r\n]+/g, ' ').slice(0, 256);

        const successUrl = safeOrgSlug
            ? `${APP_BASE_URL}/catalog/${encodeURIComponent(safeOrgSlug)}/success/${encodeURIComponent(invoiceId)}?reference=${encodeURIComponent(reference)}`
            : `${APP_BASE_URL}/catalog/success/${encodeURIComponent(invoiceId)}?reference=${encodeURIComponent(reference)}`;

        const payload = {
            organization_id: POLAR_ORG_ID,
            amount: amountInCents,
            currency: checkoutCurrency,
            customer_email: customerEmail,
            customer_name: safeCustomerName,
            success_url: successUrl,
            metadata: {
                invoice_id: invoiceId,
                organization_id: invoice.organization_id,
                reference,
                description: safeDescription,
            },
        };

        const response = await fetch('https://api.polar.sh/v1/checkouts/custom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15_000),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Polar init failed');
            return res.status(400).json({ error: 'Failed to initialize payment' });
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
