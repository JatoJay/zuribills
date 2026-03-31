import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslationContext } from '@/context/TranslationContext';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';

interface LanguageSelectorProps {
    className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
    const { language, setLanguage } = useTranslationContext();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        localStorage.setItem(LANGUAGE_SOURCE_KEY, 'user');
        setLanguage(e.target.value);
    };

    return (
        <div className={`flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3 py-1.5 text-xs text-muted shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
            <Globe className="w-3.5 h-3.5" />
            <select
                aria-label="Language"
                value={language}
                onChange={handleChange}
                className="bg-transparent text-foreground text-xs sm:text-sm focus:outline-none w-[92px] sm:w-[140px]"
            >
                {SUPPORTED_LANGUAGES.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;
