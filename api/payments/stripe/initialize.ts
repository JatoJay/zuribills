import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
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

    const { invoiceId, amount, currency, email, name, description } = req.body || {};

    if (!invoiceId || !amount || !currency || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    try {
        const stripe = new Stripe(STRIPE_SECRET_KEY);

        const amountInCents = Math.round(Number(amount) * 100);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: description || `Invoice ${invoiceId}`,
                            description: `Payment for Invoice ${invoiceId}`,
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                invoiceId,
                customerName: name || 'Customer',
            },
            success_url: `${APP_BASE_URL}/catalog/success/${invoiceId}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_BASE_URL}/catalog/invoice/${invoiceId}?payment=cancelled`,
        });

        return res.status(200).json({
            success: true,
            reference: session.id,
            session_id: session.id,
            url: session.url,
            checkout_url: session.url,
        });
    } catch (error: any) {
        console.error('Stripe initialization error:', error);
        return res.status(500).json({
            error: error.message || 'Payment service error'
        });
    }
}
