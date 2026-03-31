import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZuriBills <noreply@zuribills.com>';
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';
const WELCOME_TEMPLATE_ID = process.env.RESEND_WELCOME_TEMPLATE_ID || '';

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
        const emailPayload: Record<string, any> = {
            from: FROM_EMAIL,
            to: [to],
            subject: `Welcome to ZuriBills${orgName ? `, ${orgName}` : ''}!`,
        };

        if (WELCOME_TEMPLATE_ID) {
            emailPayload.template_id = WELCOME_TEMPLATE_ID;
            emailPayload.data = {
                userName: userName || 'there',
                orgName: orgName || '',
                dashboardLink,
            };
        } else {
            emailPayload.html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 32px 40px; text-align: center; background-color: #0EA5A4;">
                            <img src="${APP_BASE_URL}/logo-white.png" alt="ZuriBills" width="80" height="80" style="display: block; margin: 0 auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">Welcome to ZuriBills!</h2>
                            <p style="margin: 0 0 20px; color: #666666; font-size: 16px;">Hi ${userName || 'there'},</p>
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Thank you for joining ZuriBills! We're excited to have you on board.
                            </p>
                            <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                With ZuriBills, you can:
                            </p>
                            <ul style="margin: 0 0 30px; padding-left: 20px; color: #333333; font-size: 16px; line-height: 1.8;">
                                <li>Create and send professional invoices</li>
                                <li>Accept payments online</li>
                                <li>Track expenses and cash flow</li>
                                <li>Manage clients and services</li>
                            </ul>
                            <table role="presentation" style="margin: 30px 0;">
                                <tr>
                                    <td>
                                        <a href="${dashboardLink}" style="display: inline-block; padding: 14px 28px; background-color: #0EA5A4; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 16px;">Go to Dashboard</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 30px 0 0; color: #999999; font-size: 14px;">
                                If you have any questions, we're here to help!
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                &copy; ${new Date().getFullYear()} <a href="${APP_BASE_URL}" style="color: #0EA5A4; text-decoration: none;">ZuriBills</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailPayload),
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
