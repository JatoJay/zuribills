import { useEffect, useMemo } from 'react';
import { useTranslationContext } from '@/context/TranslationContext';

export const useTranslation = (strings: string[]) => {
    const { language, setLanguage, t, isTranslating, translateStrings } = useTranslationContext();
    const stableKey = useMemo(() => strings.join('||'), [strings]);

    useEffect(() => {
        translateStrings(strings);
    }, [language, stableKey, translateStrings]);

    return { t, language, setLanguage, isTranslating };
};
