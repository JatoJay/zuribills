import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZuriBills <noreply@zuribills.com>';
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';
const INVOICE_TEMPLATE_ID = '87e1cfc1-20fe-48a9-bc30-4294d95324cd';

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

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return res.status(500).json({ error: 'Email service not configured' });
    }

    const { to, subject, body, invoiceNumber, clientName, invoiceId, orgSlug } = req.body;

    if (!to || !subject) {
        return res.status(400).json({ error: 'Missing required fields: to, subject' });
    }

    const invoiceLink = invoiceId && orgSlug
        ? `${APP_BASE_URL}/catalog/${orgSlug}/invoice/${invoiceId}`
        : `${APP_BASE_URL}`;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject,
                template_id: INVOICE_TEMPLATE_ID,
                data: {
                    invoiceNumber: invoiceNumber || '',
                    clientName: clientName || 'Customer',
                    body: body || 'Please find your invoice attached. Thank you for your business!',
                    invoiceLink,
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API error:', data);
            return res.status(response.status).json({
                error: data.message || 'Failed to send email'
            });
        }

        return res.status(200).json({
            success: true,
            messageId: data.id
        });
    } catch (error: any) {
        console.error('Email send error:', error);
        return res.status(500).json({ error: 'Failed to send email' });
    }
}
