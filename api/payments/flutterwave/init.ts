import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    applyCors,
    SLUG_REGEX,
    EMAIL_REGEX,
    getInvoiceById,
    getOrganizationById,
    checkRateLimit,
} from '../../_lib/security';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'flw-init', 30, 60_000)) return;

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

    const {
        i: invoiceId,
        z: customerEmail,
        n: customerName,
        d: description,
        o: orgSlug,
    } = decoded;

    if (!invoiceId || typeof invoiceId !== 'string') {
        return res.status(400).json({ error: 'Missing invoiceId' });
    }
    if (!customerEmail || typeof customerEmail !== 'string' || !EMAIL_REGEX.test(customerEmail) || customerEmail.length > 254) {
        return res.status(400).json({ error: 'Invalid customer email' });
    }
    if (orgSlug && (typeof orgSlug !== 'string' || !SLUG_REGEX.test(orgSlug))) {
        return res.status(400).json({ error: 'Invalid orgSlug' });
    }

    if (!FLW_SECRET_KEY) {
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
    const currency = String(invoice.currency || org.currency || 'NGN').toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
        return res.status(400).json({ error: 'Invalid invoice total' });
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ error: 'Invalid currency' });
    }

    const safeOrgSlug = orgSlug || org.slug || '';
    const safeCustomerName = String(customerName || 'Customer').replace(/[\r\n]+/g, ' ').slice(0, 128);
    const safeDescription = String(description || `Payment for Invoice ${invoiceId}`).replace(/[\r\n]+/g, ' ').slice(0, 256);

    try {
        const reference = `ZB-${invoiceId}-${Date.now()}`;

        const redirectUrl = safeOrgSlug
            ? `${APP_BASE_URL}/catalog/${encodeURIComponent(safeOrgSlug)}/success/${encodeURIComponent(invoiceId)}?reference=${encodeURIComponent(reference)}`
            : `${APP_BASE_URL}/catalog/success/${encodeURIComponent(invoiceId)}?reference=${encodeURIComponent(reference)}`;

        const payload = {
            tx_ref: reference,
            amount,
            currency,
            redirect_url: redirectUrl,
            customer: {
                email: customerEmail,
                name: safeCustomerName,
            },
            customizations: {
                title: 'ZuriBills Payment',
                description: safeDescription,
                logo: `${APP_BASE_URL}/logo.svg`,
            },
            meta: {
                invoice_id: invoiceId,
                organization_id: invoice.organization_id,
                reference,
                org_slug: safeOrgSlug,
            },
        };

        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${FLW_SECRET_KEY}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15_000),
        });

        const responseData = await response.json();

        if (!response.ok || responseData.status !== 'success') {
            console.error('Flutterwave init failed');
            return res.status(400).json({ error: 'Failed to initialize payment' });
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
