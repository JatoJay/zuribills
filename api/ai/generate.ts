import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth, checkRateLimit } from '../_lib/security';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MODEL_REGEX = /^[a-zA-Z0-9._-]{1,64}$/;
const MAX_PROMPT_LEN = 32_000;
const MAX_SCHEMA_BYTES = 16_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'ai-generate', 20, 60_000)) return;

    const user = await requireAuth(req, res);
    if (!user) return;

    const { prompt, schema } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LEN) {
        return res.status(400).json({ error: `prompt must be a string up to ${MAX_PROMPT_LEN} chars` });
    }
    if (schema !== undefined && schema !== null) {
        if (typeof schema !== 'object') {
            return res.status(400).json({ error: 'schema must be an object' });
        }
        try {
            const serialized = JSON.stringify(schema);
            if (serialized.length > MAX_SCHEMA_BYTES) {
                return res.status(400).json({ error: 'schema too large' });
            }
        } catch {
            return res.status(400).json({ error: 'Invalid schema' });
        }
    }

    if (!geminiApiKey) {
        return res.status(500).json({ error: 'AI service not configured' });
    }
    if (!MODEL_REGEX.test(geminiModel)) {
        return res.status(500).json({ error: 'AI model misconfigured' });
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
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(45_000),
            }
        );

        if (!response.ok) {
            console.error('Gemini API error');
            return res.status(502).json({ error: 'AI generation failed' });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text || typeof text !== 'string') {
            return res.status(502).json({ error: 'No response from AI' });
        }

        return res.status(200).json({ text });
    } catch (error) {
        console.error('AI generation error');
        return res.status(500).json({ error: 'AI service error' });
    }
}
