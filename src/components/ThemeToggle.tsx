import React, { useMemo } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const translationStrings = useMemo(() => ([
        'Toggle theme',
    ]), []);
    const { t } = useTranslation(translationStrings);

    return (
        <button
            onClick={toggleTheme}
            className={`
        flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-300
        ${theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-primary hover:bg-white/10'
                    : 'bg-black/5 border-black/10 text-foreground hover:bg-black/10'}
      `}
            aria-label={t('Toggle theme')}
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
};

export default ThemeToggle;
