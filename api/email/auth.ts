import type { VercelRequest, VercelResponse } from '@vercel/node';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'ZuriBills <noreply@zuribills.com>';
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

type EmailType = 'welcome' | 'login_alert' | 'password_reset';

const getEmailContent = (type: EmailType, _data: Record<string, string> = {}) => {
    switch (type) {
        case 'welcome':
            return {
                subject: 'Welcome to ZuriBills!',
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #0EA5A4;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Welcome to ZuriBills!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Thanks for signing up! You're all set to start creating professional invoices and getting paid faster.
                            </p>
                            <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                Your 3-day free trial has started. Explore all features with no limitations.
                            </p>
                            <table role="presentation">
                                <tr>
                                    <td>
                                        <a href="${APP_BASE_URL}/login" style="display: inline-block; padding: 14px 28px; background-color: #0EA5A4; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 16px;">
                                            Go to Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                <a href="${APP_BASE_URL}" style="color: #0EA5A4; text-decoration: none;">ZuriBills</a> - Get paid faster
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
            };

        case 'login_alert':
            return {
                subject: 'New login to your ZuriBills account',
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #0EA5A4;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">ZuriBills</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                                New Sign-in Detected
                            </h2>
                            <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                                We noticed a new sign-in to your ZuriBills account. If this was you, no action is needed.
                            </p>
                            <p style="margin: 0 0 20px; color: #666666; font-size: 14px;">
                                Time: ${new Date().toLocaleString()}
                            </p>
                            <p style="margin: 20px 0 0; color: #999999; font-size: 14px;">
                                If this wasn't you, please secure your account immediately by changing your password.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9f9f9; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                <a href="${APP_BASE_URL}" style="color: #0EA5A4; text-decoration: none;">ZuriBills</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
            };

        default:
            return {
                subject: 'ZuriBills Notification',
                html: `<p>You have a notification from ZuriBills.</p>`
            };
    }
};

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
        return res.status(200).json({ success: true, skipped: true });
    }

    const { to, type } = req.body;

    if (!to || !type) {
        return res.status(400).json({ error: 'Missing required fields: to, type' });
    }

    const emailContent = getEmailContent(type as EmailType);

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
                subject: emailContent.subject,
                html: emailContent.html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API error:', data);
            return res.status(200).json({ success: false, error: data.message });
        }

        return res.status(200).json({
            success: true,
            messageId: data.id
        });
    } catch (error: any) {
        console.error('Email send error:', error);
        return res.status(200).json({ success: false, error: error.message });
    }
}
