import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    applyCors,
    requireAuth,
    getOrgMembership,
    getInvoiceById,
    getOrganizationById,
    escapeHtml,
    stripCRLF,
    checkRateLimit,
    EMAIL_REGEX,
    SLUG_REGEX,
    ID_REGEX,
} from '../_lib/security';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ZuriBills <noreply@zuribills.com>';
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

const escapeHtmlPreserveNewlines = (value: unknown): string =>
    escapeHtml(value).replace(/\n/g, '<br>');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'email-invoice', 20, 60_000)) return;

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return res.status(500).json({ error: 'Email service not configured' });
    }

    const user = await requireAuth(req, res);
    if (!user) return;

    const { to, subject, body, clientName, invoiceId, orgSlug } = req.body || {};

    if (!invoiceId || typeof invoiceId !== 'string' || !ID_REGEX.test(invoiceId)) {
        return res.status(400).json({ error: 'Invalid invoiceId' });
    }
    if (orgSlug && (typeof orgSlug !== 'string' || !SLUG_REGEX.test(orgSlug))) {
        return res.status(400).json({ error: 'Invalid orgSlug' });
    }
    if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to) || to.length > 254) {
        return res.status(400).json({ error: 'Invalid recipient email' });
    }
    if (!subject || typeof subject !== 'string' || subject.length > 200) {
        return res.status(400).json({ error: 'Invalid subject' });
    }

    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
    }

    const membership = await getOrgMembership(user.id, invoice.organization_id);
    if (!membership) {
        return res.status(403).json({ error: 'Not authorized for this invoice' });
    }

    const recipient = (invoice.client_email && EMAIL_REGEX.test(invoice.client_email))
        ? invoice.client_email
        : to;

    const org = await getOrganizationById(invoice.organization_id);
    const safeOrgSlug = (orgSlug && SLUG_REGEX.test(orgSlug)) ? orgSlug : (org?.slug || '');

    const invoiceLink = safeOrgSlug
        ? `${APP_BASE_URL}/catalog/${encodeURIComponent(safeOrgSlug)}/invoice/${encodeURIComponent(invoiceId)}`
        : null;

    const safeSubject = stripCRLF(subject).slice(0, 200);
    const safeClientName = clientName ? escapeHtml(String(clientName).slice(0, 128)) : '';
    const safeBody = body ? escapeHtmlPreserveNewlines(String(body).slice(0, 5000)) : '';
    const safeInvoiceNumber = invoice.invoice_number
        ? escapeHtml(String(invoice.invoice_number).slice(0, 64))
        : '';

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
                                ${safeInvoiceNumber ? `Invoice ${safeInvoiceNumber}` : 'Invoice'}
                            </h2>
                            ${(!safeBody && safeClientName) ? `<p style="margin: 0 0 20px; color: #666666; font-size: 16px;">Dear ${safeClientName},</p>` : ''}
                            <div style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                                ${safeBody || 'Please find your invoice attached. Thank you for your business!'}
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
                to: [recipient],
                subject: safeSubject,
                html: htmlBody,
            }),
            signal: AbortSignal.timeout(10_000),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API error');
            return res.status(502).json({ error: 'Failed to send email' });
        }

        return res.status(200).json({
            success: true,
            messageId: data.id,
        });
    } catch (error: any) {
        console.error('Email send error:', error?.message || 'unknown');
        return res.status(500).json({ error: 'Failed to send email' });
    }
}
