import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export const Button = ({
  children, variant = 'primary', className = '', isLoading = false, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost', isLoading?: boolean }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98]";
  const defaultPadding = className.includes('h-') && className.includes('w-') ? "" : "h-10 py-2 px-5";

  const variants = {
    primary: "bg-primary text-[var(--on-primary)] hover:bg-primary/90 hover:shadow-lg shadow-soft",
    secondary: "bg-surface/80 backdrop-blur-md text-foreground border border-white/20 hover:bg-surface hover:border-white/30",
    outline: "border border-foreground/20 text-foreground hover:bg-foreground hover:text-background hover:border-foreground",
    danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg",
    ghost: "text-muted hover:text-foreground hover:bg-foreground/5 border border-transparent",
  };

  return (
    <button
      className={`${baseStyle} ${defaultPadding} ${variants[variant] || variants.primary} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) => (
  <div className="w-full">
    {label && (
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block text-foreground">
        {label}
      </label>
    )}
    <input
      className={`flex h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 hover:border-primary/30 ${error ? 'border-red-500 focus:ring-red-500/30' : ''} ${props.className || ''}`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">{error}</p>}
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
        className={`flex h-11 w-full appearance-none rounded-xl border border-border bg-background px-4 py-2 pr-10 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/30 cursor-pointer ${className}`}
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-transform duration-200" />
    </div>
  </div>
);

export const Card = ({ children, className = '', interactive = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) => (
  <div
    className={`rounded-2xl border border-white/10 bg-surface/80 backdrop-blur-md text-foreground shadow-glass transition-all duration-300 ${interactive ? 'hover:shadow-lift hover:border-white/20 hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const GlassCard = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`rounded-2xl border border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-xl text-foreground shadow-glass transition-all duration-300 ${className}`}
    {...props}
  >
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
    PAID: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    SENT: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30',
    DRAFT: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30',
    OVERDUE: 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30',
    SUBMITTED: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    OWNER: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30',
    ADMIN: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
    ASSISTANT: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
  };
  const displayLabel = label || BADGE_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm transition-colors duration-200 ${styles[status] || styles.DRAFT}`}>
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface/95 backdrop-blur-xl w-full max-w-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {title && <h3 className="text-xl font-bold mb-4 text-foreground">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
};

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-surface via-surface/50 to-surface bg-[length:200%_100%] rounded-lg ${className}`} />
);

export const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>
  </div>
);
