import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Modal, Button } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';

type PromptType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface PromptOptions {
  title?: string;
  message: string;
  type?: PromptType;
  confirmText?: string;
  cancelText?: string;
}

interface PromptContextType {
  alert: (options: PromptOptions | string) => Promise<void>;
  confirm: (options: PromptOptions | string) => Promise<boolean>;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PromptOptions & { resolve: (val: any) => void }>({
    message: '',
    resolve: () => {},
  });

  const translationStrings = useMemo(() => ([
    'Confirm', 'Cancel', 'OK', 'Attention', 'Success', 'Error', 'Information'
  ]), []);
  const { t } = useTranslation(translationStrings);

  const show = useCallback((opts: PromptOptions): Promise<any> => {
    return new Promise((resolve) => {
      setOptions({ ...opts, resolve });
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((opts: PromptOptions | string) => {
    const options = typeof opts === 'string' ? { message: opts, type: 'info' as PromptType } : opts;
    return show({ ...options, cancelText: '' });
  }, [show]);

  const confirm = useCallback((opts: PromptOptions | string) => {
    const options = typeof opts === 'string' ? { message: opts, type: 'confirm' as PromptType } : opts;
    return show({ ...options, type: options.type || 'confirm' });
  }, [show]);

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    options.resolve(value);
  };

  const Icon = useMemo(() => {
    switch (options.type) {
      case 'success': return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-12 h-12 text-amber-500" />;
      case 'error': return <AlertCircle className="w-12 h-12 text-red-500" />;
      case 'confirm': return <HelpCircle className="w-12 h-12 text-primary" />;
      default: return <Info className="w-12 h-12 text-blue-500" />;
    }
  }, [options.type]);

  const defaultTitle = useMemo(() => {
    switch (options.type) {
      case 'success': return t('Success');
      case 'warning': return t('Attention');
      case 'error': return t('Error');
      case 'confirm': return t('Confirm');
      default: return t('Information');
    }
  }, [options.type, t]);

  return (
    <PromptContext.Provider value={{ alert, confirm }}>
      {children}
      <Modal isOpen={isOpen} onClose={() => handleClose(false)}>
        <div className="flex flex-col items-center text-center py-4">
          <div className="mb-4 p-3 rounded-full bg-surface-variant">
            {Icon}
          </div>
          <h3 className="text-xl font-bold mb-2">{options.title || defaultTitle}</h3>
          <p className="text-muted text-sm leading-relaxed mb-8 max-w-[280px]">
            {t(options.message)}
          </p>
          <div className="flex w-full gap-3">
            {options.cancelText !== '' && (
              <Button 
                variant="secondary" 
                className="flex-1 rounded-xl" 
                onClick={() => handleClose(false)}
              >
                {t(options.cancelText || 'Cancel')}
              </Button>
            )}
            <Button 
              variant={options.type === 'error' || options.type === 'warning' ? 'danger' : 'primary'} 
              className="flex-1 rounded-xl" 
              onClick={() => handleClose(true)}
            >
              {t(options.confirmText || 'OK')}
            </Button>
          </div>
        </div>
      </Modal>
    </PromptContext.Provider>
  );
};

export const usePrompt = () => {
  const context = useContext(PromptContext);
  if (!context) throw new Error('usePrompt must be used within PromptProvider');
  return context;
};
