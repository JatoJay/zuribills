import type { VercelRequest, VercelResponse } from '@vercel/node';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, schema } = req.body || {};

    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!geminiApiKey) {
        return res.status(500).json({ error: 'AI service not configured' });
    }

    try {
        const requestBody: any = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        };

        if (schema) {
            requestBody.generationConfig.responseMimeType = 'application/json';
            requestBody.generationConfig.responseSchema = schema;
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', errorData);
            return res.status(500).json({ error: 'AI generation failed' });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(500).json({ error: 'No response from AI' });
        }

        return res.status(200).json({ text });
    } catch (error) {
        console.error('AI generation error:', error);
        return res.status(500).json({ error: 'AI service error' });
    }
}
