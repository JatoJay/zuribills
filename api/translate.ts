import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth, checkRateLimit } from './_lib/security';

const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

const LANG_CODE_REGEX = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})?$/;
const MAX_TEXTS = 64;
const MAX_TEXT_LEN = 5000;

const GOOGLE_LANGUAGE_CODE_MAP: Record<string, string> = {
    english: 'en', french: 'fr', spanish: 'es', portuguese: 'pt', arabic: 'ar',
    german: 'de', hindi: 'hi', bengali: 'bn', 'chinese (simplified)': 'zh-CN',
    'chinese (traditional)': 'zh-TW', chinese: 'zh-CN', japanese: 'ja', korean: 'ko',
    italian: 'it', dutch: 'nl', russian: 'ru', turkish: 'tr', indonesian: 'id',
    vietnamese: 'vi', swahili: 'sw', kinyarwanda: 'rw', hausa: 'ha', yoruba: 'yo',
    igbo: 'ig', twi: 'ak', zulu: 'zu', afrikaans: 'af', 'nigerian pidgin': 'pcm',
    amharic: 'am', somali: 'so', xhosa: 'xh', shona: 'sn', sesotho: 'st',
    setswana: 'tn', pidgin: 'pcm', 'pidgin english': 'pcm', naija: 'pcm', akan: 'ak',
    polish: 'pl', ukrainian: 'uk', czech: 'cs', greek: 'el', hungarian: 'hu',
    romanian: 'ro', swedish: 'sv', norwegian: 'no', danish: 'da', finnish: 'fi',
    urdu: 'ur', persian: 'fa', farsi: 'fa', hebrew: 'he', thai: 'th',
    malayalam: 'ml', tamil: 'ta', telugu: 'te', kannada: 'kn', gujarati: 'gu',
    marathi: 'mr', punjabi: 'pa', malay: 'ms', tagalog: 'tl', filipino: 'tl',
};

const resolveLanguageCode = (language: string): string => {
    const normalized = String(language || '').toLowerCase().trim().slice(0, 64);
    return GOOGLE_LANGUAGE_CODE_MAP[normalized] || normalized;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!checkRateLimit(req, res, 'translate', 30, 60_000)) return;

    const user = await requireAuth(req, res);
    if (!user) return;

    const { texts, targetLanguage, sourceLanguage } = req.body || {};

    if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS) {
        return res.status(400).json({ error: `texts must be a non-empty array of up to ${MAX_TEXTS} items` });
    }
    if (!texts.every((t) => typeof t === 'string' && t.length <= MAX_TEXT_LEN)) {
        return res.status(400).json({ error: `Each text must be a string up to ${MAX_TEXT_LEN} chars` });
    }
    if (!targetLanguage || typeof targetLanguage !== 'string') {
        return res.status(400).json({ error: 'Missing targetLanguage' });
    }
    if (sourceLanguage && typeof sourceLanguage !== 'string') {
        return res.status(400).json({ error: 'Invalid sourceLanguage' });
    }

    if (!googleTranslateApiKey) {
        return res.status(500).json({ error: 'Translation service not configured' });
    }

    const targetCode = resolveLanguageCode(targetLanguage);
    const sourceCode = sourceLanguage ? resolveLanguageCode(sourceLanguage) : 'en';

    if (!LANG_CODE_REGEX.test(targetCode) || !LANG_CODE_REGEX.test(sourceCode)) {
        return res.status(400).json({ error: 'Invalid language code' });
    }

    if (targetCode === sourceCode) {
        return res.status(200).json({ translations: texts });
    }

    try {
        const response = await fetch(
            `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(googleTranslateApiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: texts,
                    target: targetCode,
                    source: sourceCode,
                    format: 'text',
                }),
                signal: AbortSignal.timeout(20_000),
            }
        );

        if (!response.ok) {
            console.error('Google Translate API error');
            return res.status(502).json({ error: 'Translation failed' });
        }

        const data = await response.json();
        const translations = data?.data?.translations?.map((t: any) => String(t.translatedText || '')) || texts;

        return res.status(200).json({ translations });
    } catch (error) {
        console.error('Translation error');
        return res.status(500).json({ error: 'Translation service error' });
    }
}
