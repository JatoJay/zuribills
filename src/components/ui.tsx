import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export const Button = ({
  children, variant = 'primary', className = '', isLoading = false, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost', isLoading?: boolean }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";
  const defaultPadding = className.includes('h-') && className.includes('w-') ? "" : "h-10 py-2 px-4";

  const variants = {
    primary: "bg-primary text-[var(--on-primary)] hover:bg-primary/90 shadow-soft",
    secondary: "bg-surface text-foreground border border-foreground/10 hover:bg-foreground/5",
    outline: "border border-foreground text-foreground hover:bg-foreground hover:text-background",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-muted hover:text-foreground hover:bg-foreground/5 border border-transparent",
  };

  return (
    <button className={`${baseStyle} ${defaultPadding} ${variants[variant] || variants.primary} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) => (
  <div className="w-full">
    {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block text-foreground">{label}</label>}
    <input
      className={`flex h-11 w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 ${error ? 'border-red-500' : ''} ${props.className}`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export const Select = ({
  label,
  options,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { label: string, value: string }[] }) => (
  <div className="w-full">
    {label && <label className="text-sm font-medium leading-none mb-2 block text-foreground">{label}</label>}
    <div className="relative">
      <select
        className={`flex h-11 w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  </div>
);

export const Card = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-2xl border border-border bg-surface text-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const BADGE_LABELS: Record<string, string> = {
  PAID: 'Paid',
  SENT: 'Sent',
  DRAFT: 'Draft',
  OVERDUE: 'Overdue',
  SUBMITTED: 'Submitted',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  ASSISTANT: 'Assistant',
};

const BADGE_TRANSLATIONS = Object.values(BADGE_LABELS);

export const Badge = ({ status, label }: { status: string; label?: string }) => {
  const { t } = useTranslation(BADGE_TRANSLATIONS);
  const styles: Record<string, string> = {
    PAID: 'bg-primary/30 text-foreground',
    SENT: 'bg-foreground/5 text-foreground',
    DRAFT: 'bg-foreground/5 text-muted',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const displayLabel = label || BADGE_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] || styles.DRAFT}`}>
      {t(displayLabel)}
    </span>
  );
}

export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-surface w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {title && <h3 className="text-xl font-bold mb-4">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
};
