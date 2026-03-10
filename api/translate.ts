import type { VercelRequest, VercelResponse } from '@vercel/node';

const googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

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
    const normalized = language.toLowerCase().trim();
    return GOOGLE_LANGUAGE_CODE_MAP[normalized] || normalized;
};

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

    const { texts, targetLanguage, sourceLanguage } = req.body || {};

    if (!texts || !Array.isArray(texts) || !targetLanguage) {
        return res.status(400).json({ error: 'Missing texts array or targetLanguage' });
    }

    if (!googleTranslateApiKey) {
        return res.status(500).json({ error: 'Translation service not configured' });
    }

    const targetCode = resolveLanguageCode(targetLanguage);
    const sourceCode = sourceLanguage ? resolveLanguageCode(sourceLanguage) : 'en';

    if (targetCode === sourceCode) {
        return res.status(200).json({ translations: texts });
    }

    try {
        const response = await fetch(
            `https://translation.googleapis.com/language/translate/v2?key=${googleTranslateApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: texts,
                    target: targetCode,
                    source: sourceCode,
                    format: 'text',
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Google Translate API error:', errorData);
            return res.status(500).json({ error: 'Translation failed' });
        }

        const data = await response.json();
        const translations = data?.data?.translations?.map((t: any) => t.translatedText) || texts;

        return res.status(200).json({ translations });
    } catch (error) {
        console.error('Translation error:', error);
        return res.status(500).json({ error: 'Translation service error' });
    }
}
