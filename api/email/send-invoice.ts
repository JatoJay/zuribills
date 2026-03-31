import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZuriBills <noreply@zuribills.com>';
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
        : null;

    const htmlBody = `
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
                        <td style="padding: 24px 40px; text-align: center; background-color: #0EA5A4;">
                            <div style="display: inline-block; background: #ffffff; padding: 12px 20px; border-radius: 12px;">
                                <img src="${APP_BASE_URL}/logo.png" alt="ZuriBills" height="50" style="display: block; margin: 0 auto;">
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                                ${invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice'}
                            </h2>
                            ${(!body && clientName) ? `<p style="margin: 0 0 20px; color: #666666; font-size: 16px;">Dear ${clientName},</p>` : ''}
                            <div style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                ${body ? body.replace(/\n/g, '<br>') : 'Please find your invoice attached. Thank you for your business!'}
                            </div>
                            ${invoiceLink ? `
                            <table role="presentation" style="margin: 30px 0;">
                                <tr>
                                    <td>
                                        <a href="${invoiceLink}" style="display: inline-block; padding: 14px 28px; background-color: #0EA5A4; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 16px;">
                                            View Invoice
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            <p style="margin: 30px 0 0; color: #999999; font-size: 14px;">
                                If you have any questions, please don't hesitate to reach out.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                Sent via <a href="${APP_BASE_URL}" style="color: #0EA5A4; text-decoration: none;">ZuriBills</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

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
                html: htmlBody,
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
