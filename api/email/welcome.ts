import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZuriBills <noreply@zuribills.com>';
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';
const WELCOME_TEMPLATE_ID = 'd4783cd2-24f2-4acc-85e3-f8164ae5e2ab';

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

    const { to, userName, orgName, orgSlug } = req.body;

    if (!to) {
        return res.status(400).json({ error: 'Missing required field: to' });
    }

    const dashboardLink = orgSlug ? `${APP_BASE_URL}/org/${orgSlug}` : APP_BASE_URL;

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
                subject: `Welcome to ZuriBills${orgName ? `, ${orgName}` : ''}!`,
                template_id: WELCOME_TEMPLATE_ID,
                data: {
                    userName: userName || 'there',
                    orgName: orgName || '',
                    dashboardLink,
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
