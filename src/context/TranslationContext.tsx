import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translateBatch } from '@/services/geminiService';

type TranslationContextType = {
    language: string;
    setLanguage: (language: string) => void;
    t: (text: string) => string;
    isTranslating: boolean;
    translateStrings: (strings: string[]) => Promise<void>;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const LANGUAGE_KEY = 'invoiceflow:language';
const CACHE_PREFIX = 'invoiceflow:translations:';

const normalizeLanguage = (language: string) => {
    const trimmed = language.trim();
    return trimmed ? trimmed : 'English';
};

const loadCachedTranslations = (language: string) => {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${normalizeLanguage(language).toLowerCase()}`);
    if (!cached) return {};
    try {
        return JSON.parse(cached) as Record<string, string>;
    } catch (error) {
        console.error('Failed to parse translation cache', error);
        return {};
    }
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        const stored = localStorage.getItem(LANGUAGE_KEY);
        return stored || 'English';
    });
    const [translations, setTranslations] = useState<Record<string, string>>(() => loadCachedTranslations(language));
    const [isTranslating, setIsTranslating] = useState(false);

    const normalizedLanguage = useMemo(() => normalizeLanguage(language), [language]);
    const isEnglish = normalizedLanguage.toLowerCase() === 'english';

    const setLanguage = useCallback((nextLanguage: string) => {
        const normalized = normalizeLanguage(nextLanguage);
        localStorage.setItem(LANGUAGE_KEY, normalized);
        setLanguageState(normalized);
    }, []);

    useEffect(() => {
        if (isEnglish) {
            setTranslations({});
            return;
        }
        setTranslations(loadCachedTranslations(normalizedLanguage));
    }, [normalizedLanguage, isEnglish]);

    const t = useCallback((text: string) => {
        if (isEnglish) return text;
        return translations[text] || text;
    }, [translations, isEnglish]);

    const translateStrings = useCallback(async (strings: string[]) => {
        if (isEnglish) return;
        const normalized = normalizeLanguage(language);
        const uniqueStrings = Array.from(new Set(strings.filter(Boolean)));
        const missing = uniqueStrings.filter((item) => !translations[item]);
        if (!missing.length) return;

        setIsTranslating(true);
        try {
            const translated = await translateBatch(missing, normalized);
            setTranslations((prev) => {
                const merged = { ...prev };
                missing.forEach((item, index) => {
                    merged[item] = translated[index] || item;
                });
                localStorage.setItem(`${CACHE_PREFIX}${normalized.toLowerCase()}`, JSON.stringify(merged));
                return merged;
            });
        } catch (error) {
            console.error('Translation batch failed', error);
        } finally {
            setIsTranslating(false);
        }
    }, [isEnglish, language, translations]);

    const value = useMemo(() => ({
        language: normalizedLanguage,
        setLanguage,
        t,
        isTranslating,
        translateStrings,
    }), [normalizedLanguage, setLanguage, t, isTranslating, translateStrings]);

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslationContext = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslationContext must be used within a TranslationProvider');
    }
    return context;
};
