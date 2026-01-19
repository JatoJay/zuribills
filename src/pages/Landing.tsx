import React, { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input } from '../components/ui';
import { askBusinessAnalyst } from '@/services/geminiService';
import { useTranslation } from '@/hooks/useTranslation';
import { useParallax } from '@/hooks/useParallax';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';
import {
  CheckCircle,
  Zap,
  Globe,
  Layers,
  Play,
  ArrowRight,
  Twitter,
  Instagram,
  Linkedin,
  Sparkles,
  MousePointer2,
  BarChart3,
  ShieldCheck,
  Wallet,
  ChevronDown,
  Bot
} from 'lucide-react';

const NAV_ITEMS = ['Product', 'How it works', 'AI insights', 'FAQ', 'Pricing'];

const HERO_HIGHLIGHTS = ['No credit card', 'Setup in minutes', 'Shareable link'];

const PRODUCT_FEATURES = [
  {
    title: 'Zooming service catalog',
    description: 'Organize packages visually so clients understand the story behind your pricing.',
  },
  {
    title: 'Expense invoices',
    description: 'Capture vendor bills, operating costs, and reimbursements in one place.',
  },
  {
    title: 'Tax-ready reports',
    description: 'Generate monthly or yearly cash-flow reports for seamless tax filing.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Build your catalog',
    description: 'Create service cards, bundles, and deposits in minutes.',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    step: '02',
    title: 'Share your link',
    description: 'Send a sleek URL that feels like a presentation.',
    icon: <MousePointer2 className="w-5 h-5" />,
  },
  {
    step: '03',
    title: 'Track expenses & report',
    description: 'Expense invoices plus inflow/outflow reports for tax time.',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
];

const AI_BULLETS = [
  'Natural language reporting',
  'Overdue invoice detection',
  'Smart follow-up suggestions',
  'Forecasting and trend alerts',
];

const ANALYTICS_BULLETS = [
  'Live revenue and pipeline metrics',
  'Expense tracking with vendor history',
  'Monthly and yearly cash-flow exports',
];

const LANGUAGE_WAVE_BARS = [
  'h-2',
  'h-3',
  'h-4',
  'h-2',
  'h-5',
  'h-3',
  'h-4',
  'h-2',
  'h-3',
  'h-5',
  'h-2',
  'h-3',
];

const LOCAL_LANGUAGES = [
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'sw', label: 'Swahili' },
  { code: 'tw', label: 'Twi' },
  { code: 'yo', label: 'Yoruba, Hausa, Igbo' },
  { code: 'zu', label: 'Zulu' },
];

const PRICING_FEATURES = [
  'Unlimited Invoices',
  'Client Portal',
  'Advanced Analytics',
  'Priority Support',
  'Custom Branding',
  'API Access',
];

type ThemeVars = React.CSSProperties &
  Record<
    | '--background'
    | '--surface'
    | '--primary'
    | '--on-primary'
    | '--secondary'
    | '--text'
    | '--text-muted'
    | '--border',
    string
  >;

const LIGHT_THEME: ThemeVars = {
  '--background': '#ffffff',
  '--surface': '#f6f6f3',
  '--primary': '#0EA5A4',
  '--on-primary': '#0b0b0b',
  '--secondary': '#0b0b0b',
  '--text': '#0b0b0b',
  '--text-muted': '#5f6368',
  '--border': '#e6e6e6',
};

const OWNER_STORIES = [
  {
    name: 'Amina Yusuf',
    role: 'Boutique Owner - Lagos',
    quote: 'InvoiceFlow keeps my catalog polished and payments predictable without extra admin work.',
    image: '/owners/owner-1.jpg',
  },
  {
    name: 'Daniel Brooks',
    role: 'Creative Studio Lead - Nairobi',
    quote: 'We send a shareable link and get paid faster. The reports are ready for tax time.',
    image: '/owners/owner-2.jpg',
  },
  {
    name: 'Priya Shah',
    role: 'Consulting Partner - London',
    quote: 'The AI insights save hours each week. Everything feels calm and organized.',
    image: '/owners/owner-3.jpg',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do I accept payments from clients?',
    answer: 'Send your catalog or invoice link. Clients pay through Afnex providers and InvoiceFlow updates the invoice status automatically.',
  },
  {
    question: 'Can I invite my team to collaborate?',
    answer: 'Yes. Add teammates to your workspace and control permissions for invoices, expenses, and reports.',
  },
  {
    question: 'What if my business operates in multiple countries?',
    answer: 'Set your payout details per business and keep each region aligned with the right currency and provider.',
  },
  {
    question: 'Is my data secure?',
    answer: 'We use Supabase with row level security, encrypted connections, and audit logs so your data stays protected.',
  },
  {
    question: 'Do I need to be an accountant to use this?',
    answer: 'No. The dashboard is designed for small teams, with guided flows and AI insights for quick decisions.',
  },
  {
    question: 'How long is the free trial?',
    answer: 'New workspaces get full access for 7 days, then you can choose a plan that fits your volume.',
  },
];

const NavBar: React.FC<{
  t: (text: string) => string;
  language: string;
  languages: string[];
  onLanguageChange: (nextLanguage: string) => void;
}> = ({ t, language, languages, onLanguageChange }) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate({ to: '/' })}
          >
            <div className="w-9 h-9 rounded-full bg-[#A9F5D9] text-black flex items-center justify-center shadow-soft ring-1 ring-black/10">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900">
              Invoice<span className="text-primary">Flow</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                {t(item)}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-white/70 px-3 py-1.5 text-xs text-muted shadow-soft">
              <Globe className="w-3.5 h-3.5" />
              <select
                aria-label={t('Language')}
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="bg-transparent text-foreground text-xs sm:text-sm focus:outline-none w-[92px] sm:w-[140px]"
              >
                {languages.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => navigate({ to: '/login' })}
              className="hidden md:inline text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              {t('Sign in')}
            </button>
            <Button
              onClick={() => navigate({ to: '/onboarding' })}
              className="px-5"
            >
              {t('Start free')}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const ZoomCanvasPreview: React.FC<{ t: (text: string) => string }> = ({ t }) => (
  <div className="relative w-full max-w-[520px] aspect-square">
    <div className="absolute inset-0 rounded-full border border-foreground/10" />
    <div className="absolute inset-12 rounded-full border border-foreground/10" />
    <div className="absolute inset-24 rounded-full border border-foreground/10" />

    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="w-28 h-28 rounded-full bg-primary text-[var(--on-primary)] flex items-center justify-center font-display text-sm uppercase tracking-widest shadow-soft">
        {t('Pay')}
      </div>
    </div>

    <div className="absolute top-10 left-6 bg-background border border-foreground/10 rounded-2xl p-4 w-40 shadow-soft animate-drift">
      <div className="text-[10px] uppercase tracking-widest text-muted">{t('Service')}</div>
      <div className="font-display text-sm text-foreground mt-1">{t('Brand Strategy')}</div>
      <div className="text-xs text-muted mt-2">$2,400</div>
    </div>

    <div className="absolute top-24 right-6 bg-background border border-foreground/10 rounded-2xl p-4 w-40 shadow-soft animate-float">
      <div className="text-[10px] uppercase tracking-widest text-muted">{t('Timeline')}</div>
      <div className="font-display text-sm text-foreground mt-1">{t('3 Weeks')}</div>
      <div className="text-xs text-muted mt-2">{t('Milestones synced')}</div>
    </div>

    <div className="absolute bottom-16 left-10 bg-background border border-foreground/10 rounded-2xl p-4 w-40 shadow-soft animate-drift">
      <div className="text-[10px] uppercase tracking-widest text-muted">{t('Invoice')}</div>
      <div className="font-display text-sm text-foreground mt-1">{t('INV-1042')}</div>
      <div className="text-xs text-muted mt-2">{t('Sent in 2s')}</div>
    </div>

    <div className="absolute bottom-8 right-8 bg-foreground text-background rounded-2xl p-4 w-44 shadow-lift">
      <div className="text-[10px] uppercase tracking-widest text-background/60">{t('Status')}</div>
      <div className="font-display text-sm text-background mt-1">{t('Paid')}</div>
      <div className="text-xs text-primary mt-2">{t('Cleared instantly')}</div>
    </div>

    <div className="absolute left-1/2 top-1/2 w-[120%] h-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-foreground/15 to-transparent rotate-[18deg]" />
  </div>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; className?: string }> = ({
  icon,
  title,
  description,
  className = '',
}) => (
  <div className={`p-6 rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl text-foreground shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] transition-transform duration-300 hover:-translate-y-1 ${className}`}>
    <div className="w-12 h-12 rounded-full bg-primary text-[var(--on-primary)] flex items-center justify-center mb-4 shadow-soft">
      {icon}
    </div>
    <h3 className="text-lg font-display font-semibold text-current mb-2">{title}</h3>
    <p className="text-sm leading-relaxed opacity-80">{description}</p>
  </div>
);

const InteractiveAIChat: React.FC<{ t: (text: string) => string }> = ({ t }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'user', text: 'How much revenue did we make this week?' },
    {
      role: 'ai',
      text: "You've generated <strong>$3,450.00</strong> this week from 12 invoices. That's a <span class='text-primary font-semibold'>15% increase</span> vs last week.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useRealAI, setUseRealAI] = useState(true);

  const demoContext = {
    invoices: [
      { invoiceNumber: 'INV-001', clientName: 'Acme Corp', total: 1200, status: 'PAID', date: '2024-12-20', dueDate: '2024-12-27' },
      { invoiceNumber: 'INV-002', clientName: 'TechCorp Inc', total: 850, status: 'PAID', date: '2024-12-21', dueDate: '2024-12-28' },
      { invoiceNumber: 'INV-003', clientName: 'StartupXYZ', total: 500, status: 'SENT', date: '2024-12-22', dueDate: '2024-12-29' },
      { invoiceNumber: 'INV-004', clientName: 'Acme Corp', total: 900, status: 'OVERDUE', date: '2024-12-15', dueDate: '2024-12-22' },
      { invoiceNumber: 'INV-005', clientName: 'GlobalTech', total: 2100, status: 'PAID', date: '2024-12-23', dueDate: '2024-12-30' },
    ],
    clients: [
      { name: 'John Smith', company: 'Acme Corp' },
      { name: 'Sarah Chen', company: 'TechCorp Inc' },
      { name: 'Mike Wilson', company: 'StartupXYZ' },
      { name: 'Emily Davis', company: 'GlobalTech' },
    ],
    services: [
      { name: 'Web Development', price: 1500 },
      { name: 'UI/UX Design', price: 800 },
      { name: 'Consulting', price: 150 },
      { name: 'SEO Audit', price: 500 },
    ],
    orgName: 'Demo Business',
    currency: 'USD',
  };

  const getSimulatedResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('overdue') || q.includes('late') || q.includes('unpaid')) {
      return "Just one: <strong>Acme Corp (Inv #004)</strong> is 3 days late. Want me to draft a reminder email?";
    }
    if (q.includes('revenue') || q.includes('income') || q.includes('earnings') || q.includes('money')) {
      return "Your total revenue this month is <strong>$12,450.00</strong> from 47 invoices. You're on track to beat last month by <span class='text-primary font-semibold'>22%</span>.";
    }
    if (q.includes('client') || q.includes('customer')) {
      return "You have <strong>24 active clients</strong>. Your top client is <strong>TechCorp Inc.</strong> with $4,200 in total billings.";
    }
    if (q.includes('invoice') && (q.includes('create') || q.includes('new') || q.includes('make'))) {
      return "I can help you create an invoice. Tell me the client name and amount, or open <strong>Dashboard → New Invoice</strong>.";
    }
    if (q.includes('email') || q.includes('remind') || q.includes('send')) {
      return 'I drafted a reminder email for overdue invoices. Send now or schedule for tomorrow morning?';
    }
    if (q.includes('forecast') || q.includes('predict') || q.includes('next month')) {
      return "Based on your trends, I predict <strong>$15,200</strong> in revenue next month. That's a <span class='text-primary font-semibold'>18% growth</span> projection.";
    }
    if (q.includes('help') || q.includes('what can you do')) {
      return 'I can help with revenue reports, invoice status, client insights, reminders, and forecasting. Ask me anything.';
    }
    return 'Everything looks healthy. Ask me about revenue, clients, or overdue invoices.';
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      let aiResponse: string;

      if (useRealAI) {
        aiResponse = await askBusinessAnalyst(userMessage, demoContext);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        aiResponse = getSimulatedResponse(userMessage);
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'ai', text: t('AI generation disbaled') }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/70 rounded-3xl border border-white/40 backdrop-blur-xl p-4 shadow-lift max-w-md mx-auto relative z-10">
      <div className="flex items-center justify-between border-b border-foreground/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-foreground">{t('InvoiceFlow AI')}</div>
            <div className="text-[10px] text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              {useRealAI ? t('Gemini Powered') : t('Demo Mode')}
            </div>
          </div>
        </div>
        <button
          onClick={() => setUseRealAI(!useRealAI)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${useRealAI
            ? 'bg-primary/20 border-primary/40 text-foreground'
            : 'bg-white/70 border-white/40 text-muted hover:text-foreground'
            }`}
          title={useRealAI ? t('Using real Gemini AI') : t('Using simulated responses')}
        >
          {useRealAI ? t('Live AI') : t('Demo')}
        </button>
      </div>

      <div className="space-y-4 text-sm font-medium h-64 overflow-y-auto no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div
              className={`px-4 py-2 rounded-2xl max-w-[85%] ${msg.role === 'user'
                ? 'bg-foreground text-background rounded-tr-none'
                : 'bg-white/80 border border-white/40 text-foreground rounded-tl-none'
                }`}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="bg-white/80 border border-white/40 text-muted px-4 py-2 rounded-2xl rounded-tl-none">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-foreground/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('Ask about revenue, clients, invoices...')}
          className="h-10 bg-white/70 border border-white/40 rounded-full flex-1 px-4 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="h-10 w-10 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-[var(--on-primary)] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const PricingTable: React.FC<{ t: (text: string) => string }> = ({ t }) => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const handleSelectPlan = (planId: string) => {
    navigate({
      to: '/onboarding',
      search: { plan: planId } as any
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-center mb-12">
        <div className="bg-white/70 border border-white/40 backdrop-blur-xl p-1 rounded-full flex relative shadow-soft">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 relative z-10 ${billingCycle === 'monthly' ? 'text-[var(--on-primary)]' : 'text-muted hover:text-foreground'}`}
          >
            {t('Monthly')}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 relative z-10 ${billingCycle === 'yearly' ? 'text-[var(--on-primary)]' : 'text-muted hover:text-foreground'}`}
          >
            {t('Yearly')}
          </button>
          <div className={`absolute top-1 bottom-1 w-[50%] bg-primary rounded-full transition-all duration-300 ${billingCycle === 'yearly' ? 'left-[49%]' : 'left-1'}`}></div>
        </div>
        {billingCycle === 'yearly' && (
          <div className="ml-4 flex items-center">
            <span className="bg-primary/20 text-foreground text-xs font-bold px-2 py-1 rounded-full border border-primary/40">
              {t('Save 10%')}
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className={`relative p-8 rounded-3xl border transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-[#0b0b0b]/90 text-white border-primary shadow-lift scale-[1.02] z-10 backdrop-blur-xl' : 'bg-white/70 border-white/40 backdrop-blur-xl hover:border-primary/30'}`}>
          <h3 className="text-xl font-display font-semibold mb-2">{t('Monthly Plan')}</h3>
          <p className={`text-sm mb-6 ${billingCycle === 'monthly' ? 'text-white/80' : 'text-muted'}`}>{t('Perfect for short-term projects and starters.')}</p>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-display font-semibold">$4.99</span>
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white/70' : 'text-muted'}`}>/mo</span>
          </div>
          <ul className="space-y-4 mb-8">
            {PRICING_FEATURES.map((feat, i) => (
              <li key={i} className={`flex items-center gap-3 text-sm ${billingCycle === 'monthly' ? 'text-white/90' : 'text-foreground'}`}>
                <CheckCircle className="w-5 h-5 text-primary" /> {t(feat)}
              </li>
            ))}
          </ul>
          <div className="mb-4">
            <span className={`text-xs ${billingCycle === 'monthly' ? 'text-white/60' : 'text-muted'}`}>
              {t('14-day free trial included')}
            </span>
          </div>
          <Button
            variant={billingCycle === 'monthly' ? 'primary' : 'outline'}
            className="w-full"
            onClick={() => handleSelectPlan('monthly')}
          >
            {t('Choose Monthly')}
          </Button>
        </div>

        <div className={`relative p-8 rounded-3xl border transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-[#0b0b0b]/90 text-white border-primary shadow-lift scale-[1.02] z-10 backdrop-blur-xl' : 'bg-white/70 border-white/40 backdrop-blur-xl hover:border-primary/30'}`}>
          {billingCycle === 'yearly' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-[var(--on-primary)] text-xs font-bold px-3 py-1 rounded-full shadow-soft">
              {t('MOST POPULAR')}
            </div>
          )}
          <h3 className="text-xl font-display font-semibold mb-2">{t('Yearly Plan')}</h3>
          <p className={`text-sm mb-6 ${billingCycle === 'yearly' ? 'text-white/80' : 'text-muted'}`}>{t('Best value for growing businesses.')}</p>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-display font-semibold">$4.50</span>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white/70' : 'text-muted'}`}>/mo</span>
          </div>
          <p className={`text-xs -mt-4 mb-6 ${billingCycle === 'yearly' ? 'text-white/80' : 'text-muted'}`}>{t('Billed $54 yearly')}</p>
          <ul className="space-y-4 mb-8">
            {PRICING_FEATURES.map((feat, i) => (
              <li key={i} className={`flex items-center gap-3 text-sm ${billingCycle === 'yearly' ? 'text-white/90' : 'text-foreground'}`}>
                <CheckCircle className="w-5 h-5 text-primary" /> {t(feat)}
              </li>
            ))}
          </ul>
          <div className="mb-4">
            <span className={`text-xs ${billingCycle === 'yearly' ? 'text-white/60' : 'text-muted'}`}>
              {t('14-day free trial included')}
            </span>
          </div>
          <Button
            variant={billingCycle === 'yearly' ? 'primary' : 'outline'}
            className="w-full"
            onClick={() => handleSelectPlan('yearly')}
          >
            {t('Choose Yearly')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const parallaxFast = useParallax(-0.2);
  const parallaxSlow = useParallax(0.1);

  const translationStrings = useMemo(() => ([
    ...NAV_ITEMS,
    'Sign in',
    'Start free',
    'Language',
    'Pay',
    'Service',
    'Brand Strategy',
    'Timeline',
    '3 Weeks',
    'Milestones synced',
    'Invoice',
    'INV-1042',
    'Sent in 2s',
    'Status',
    'Paid',
    'Cleared instantly',
    'InvoiceFlow AI',
    'Gemini Powered',
    'Demo Mode',
    'Using real Gemini AI',
    'Using simulated responses',
    'Live AI',
    'Demo',
    'Ask about revenue, clients, invoices...',
    'AI generation disbaled',
    'Monthly',
    'Yearly',
    'Save 10%',
    'Monthly Plan',
    'Perfect for short-term projects and starters.',
    'Yearly Plan',
    'Best value for growing businesses.',
    'Billed $54 yearly',
    'MOST POPULAR',
    'Choose Monthly',
    'Choose Yearly',
    ...PRICING_FEATURES,
    'Built for service teams',
    'Zoom from services to',
    'paid invoices',
    'One canvas for services, expenses, pricing, checkout, and follow-ups. Share a beautiful catalog, get paid faster, and file taxes with clean inflow/outflow reports.',
    'Watch demo',
    ...HERO_HIGHLIGHTS,
    'Admin sign-in',
    'Workspace slug (e.g. acme)',
    'New here?',
    'Create workspace',
    'Try:',
    'Organization not found',
    'Error logging in',
    'Workspace slug is required',
    'Product',
    'A single canvas for every client touchpoint.',
    'Replace scattered tools with a focused experience. Your catalog, invoices, expenses, and payments live in one place.',
    ...PRODUCT_FEATURES.flatMap(feature => [feature.title, feature.description]),
    'How it works',
    'From setup to payment in three moves.',
    ...HOW_IT_WORKS_STEPS.flatMap(step => [step.title, step.description]),
    'AI insights',
    'Ask your business anything. Get answers in seconds.',
    'Let the AI analyst monitor every invoice and turn raw data into clear, actionable insights.',
    ...AI_BULLETS,
    'Try the AI demo',
    'Local languages',
    'Engage every business in their native language.',
    'InvoiceFlow localizes catalogs, invoices, and payment prompts for every payout country, including Rwanda, Kenya, Ghana, South Africa, Nigeria, UK, US, and Canada.',
    'Video overview',
    'Payout-ready languages',
    'Local language support preview',
    ...LOCAL_LANGUAGES.flatMap(language => [language.label]),
    'Analytics',
    'Everything you need to run the back office.',
    'Track revenue, manage expenses, and export tax-ready cash-flow reports with a dashboard designed for clarity.',
    ...ANALYTICS_BULLETS,
    'Admin Dashboard Interface',
    'Business owners',
    'Built for small and medium teams.',
    'Owners use InvoiceFlow to keep invoices, expenses, and payouts calm and ready for audit.',
    ...OWNER_STORIES.flatMap(owner => [owner.name, owner.role, owner.quote]),
    'FAQ',
    'Answers for growing teams.',
    'Everything you need before you start billing clients.',
    ...FAQ_ITEMS.flatMap(item => [item.question, item.answer]),
    'Pricing that scales with your studio.',
    'Start free, upgrade when you need more automation and analytics.',
    'Disclaimer:',
    'Products',
    'Use Cases',
    'Company',
    'Developers',
    'Resources',
    'Legal',
    'End Users\' Policy',
    'Developer Policy',
    'IMS Policy',
    'Terms of Use',
    'Disclaimer',
    'Privacy Policy',
    'Security',
    'Cookies',
    'Start building',
    'with InvoiceFlow today'
  ]), []);
  const { t, language, setLanguage } = useTranslation(translationStrings);
  const languageOptions = useMemo(() => {
    if (SUPPORTED_LANGUAGES.includes(language)) {
      return SUPPORTED_LANGUAGES;
    }
    return [language, ...SUPPORTED_LANGUAGES];
  }, [language]);
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError(t('Workspace slug is required'));
      return;
    }
    setLoading(true);
    setError('');

    try {
      navigate({ to: '/login', search: { slug: slug.trim() } as any });
    } catch (err) {
      setError(t('Error logging in'));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (nextLanguage: string) => {
    localStorage.setItem(LANGUAGE_SOURCE_KEY, 'user');
    setLanguage(nextLanguage);
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-black overflow-x-hidden"
      style={LIGHT_THEME}
    >
      <NavBar
        t={t}
        language={language}
        languages={languageOptions}
        onLanguageChange={handleLanguageChange}
      />

      <section className="relative pt-36 pb-24 bg-background overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        {/* Parallax Elements */}
        <div
          className="absolute -top-24 right-0 w-[480px] h-[480px] bg-primary/30 blur-[140px]"
          style={parallaxFast}
        />
        <div
          className="absolute bottom-0 left-0 w-[320px] h-[320px] bg-foreground/10 blur-[120px]"
          style={parallaxSlow}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/10 text-xs uppercase tracking-widest text-muted mb-6">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              {t('Built for service teams')}
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-semibold leading-tight mb-6">
              {t('Zoom from services to')} <span className="text-gradient">{t('paid invoices')}</span>.
            </h1>
            <p className="text-lg text-muted mb-8 max-w-xl">
              {t('One canvas for services, expenses, pricing, checkout, and follow-ups. Share a beautiful catalog, get paid faster, and file taxes with clean inflow/outflow reports.')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => navigate({ to: '/onboarding' })} className="px-6">
                {t('Start free')}
              </Button>
              <Button variant="outline" className="px-6">
                <Play className="w-4 h-4 mr-2" /> {t('Watch demo')}
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted">
              {HERO_HIGHLIGHTS.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" /> {t(item)}
                </div>
              ))}
            </div>

            <div id="admin-signin" className="mt-10 rounded-2xl border border-foreground/10 bg-background/80 p-5 shadow-soft max-w-md">
              <h3 className="text-xs uppercase tracking-widest text-muted mb-3">{t('Admin sign-in')}</h3>
              <form onSubmit={handleAdminLogin} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={t('Workspace slug (e.g. acme)')}
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    error={error}
                  />
                </div>
                <Button type="submit" isLoading={loading} className="shrink-0 h-11 w-11 rounded-full">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>
              <div className="mt-3 text-xs text-muted flex justify-between">
                <span>
                  {t('New here?')}{' '}
                  <button onClick={() => navigate({ to: '/onboarding' })} className="text-foreground underline decoration-primary/60 underline-offset-4">
                    {t('Create workspace')}
                  </button>
                </span>
                <span>
                  {t('Try:')}{' '}
                  <button onClick={() => setSlug('acme')} className="text-foreground underline decoration-primary/60 underline-offset-4">
                    acme
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="relative w-full flex justify-center lg:justify-end">
            <ZoomCanvasPreview t={t} />
          </div>
        </div>
      </section>

      <section id="product" className="py-24 bg-transparent relative overflow-hidden">
        <div className="absolute -top-20 right-8 w-64 h-64 bg-primary/10 blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('Product')}</div>
              <h2 className="text-3xl md:text-4xl font-display font-semibold">
                {t('A single canvas for every client touchpoint.')}
              </h2>
            </div>
            <p className="text-muted max-w-xl">
              {t('Replace scattered tools with a focused experience. Your catalog, invoices, expenses, and payments live in one place.')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRODUCT_FEATURES.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={[<Layers className="w-5 h-5" />, <Wallet className="w-5 h-5" />, <BarChart3 className="w-5 h-5" />][index]}
                title={t(feature.title)}
                description={t(feature.description)}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute inset-0 bg-spotlight opacity-35" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('How it works')}</div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold">{t('From setup to payment in three moves.')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div key={item.step} className="p-6 rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs uppercase tracking-widest text-muted">{item.step}</span>
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{t(item.title)}</h3>
                <p className="text-sm text-muted">{t(item.description)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai-insights" className="py-24 bg-transparent border-t border-border/40 relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-primary/10 blur-[140px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 order-2 lg:order-1">
              <InteractiveAIChat t={t} />
            </div>

            <div className="lg:w-1/2 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/10 text-xs uppercase tracking-widest text-muted mb-6">
                <Sparkles className="w-4 h-4 text-primary" /> {t('AI insights')}
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
                {t('Ask your business anything. Get answers in seconds.')}
              </h2>
              <p className="text-lg text-muted mb-8 leading-relaxed">
                {t('Let the AI analyst monitor every invoice and turn raw data into clear, actionable insights.')}
              </p>
              <ul className="space-y-3 mb-8">
                {AI_BULLETS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted">
                    <CheckCircle className="w-5 h-5 text-primary" /> {t(item)}
                  </li>
                ))}
              </ul>
              <Button variant="secondary">{t('Try the AI demo')}</Button>
            </div>
          </div>
        </div>
      </section>

      <section id="local-languages" className="py-24 bg-transparent border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="relative overflow-hidden rounded-[32px] border border-white/40 shadow-lift min-h-[420px]">
            <img
              src="/video/local-languages.jpg"
              alt={t('Local language support preview')}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" />
            <div className="relative z-10 p-8 sm:p-12 lg:p-14 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center text-white">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/40 text-xs uppercase tracking-widest text-white/80 mb-6">
                  <Sparkles className="w-4 h-4 text-white" />
                  {t('Local languages')}
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
                  {t('Engage every business in their native language.')}
                </h2>
                <p className="text-lg text-white/80 leading-relaxed mb-8">
                  {t('InvoiceFlow localizes catalogs, invoices, and payment prompts for every payout country, including Rwanda, Kenya, Ghana, South Africa, Nigeria, UK, US, and Canada.')}
                </p>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Play className="w-4 h-4" />
                  {t('Video overview')}
                </div>
              </div>

              <div className="space-y-4">
                {LOCAL_LANGUAGES.map((language) => (
                  <div
                    key={language.code}
                    className="flex items-center gap-4 rounded-2xl border border-white/40 bg-white/15 px-4 py-3 backdrop-blur-xl shadow-soft"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/20 text-white/90 flex items-center justify-center text-xs font-bold uppercase">
                      {language.code}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{t(language.label)}</div>
                      <div className="mt-2 flex items-end gap-1">
                        {LANGUAGE_WAVE_BARS.map((height, index) => (
                          <span key={`${language.code}-${index}`} className={`w-1 ${height} rounded-full bg-white/70`} />
                        ))}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full border border-white/50 bg-white/10 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white" />
                    </div>
                  </div>
                ))}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/80">
                  <Sparkles className="w-3 h-3 text-white" />
                  {t('Payout-ready languages')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-transparent border-t border-border/40 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] bg-primary/10 rounded-full blur-[140px] -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/10 text-xs uppercase tracking-widest text-muted mb-6">
                <BarChart3 className="w-4 h-4 text-primary" /> {t('Analytics')}
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
                {t('Everything you need to run the back office.')}
              </h2>
              <p className="text-lg text-muted mb-8">
                {t('Track revenue, manage expenses, and export tax-ready cash-flow reports with a dashboard designed for clarity.')}
              </p>

              <div className="space-y-4">
                {ANALYTICS_BULLETS.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-muted">
                    <CheckCircle className="w-5 h-5 text-primary" /> {t(item)}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2">
              <div className="relative shadow-lift rounded-3xl border border-white/40 overflow-hidden bg-white/60 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
                <img
                  src="/dashboard_sync.svg"
                  alt={t('Admin Dashboard Interface')}
                  className="relative w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-transparent border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -top-24 right-8 w-72 h-72 bg-primary/10 blur-[140px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-start">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('Business owners')}</div>
              <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
                {t('Built for small and medium teams.')}
              </h2>
              <p className="text-muted text-lg leading-relaxed">
                {t('Owners use InvoiceFlow to keep invoices, expenses, and payouts calm and ready for audit.')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {OWNER_STORIES.map((owner) => (
                <div
                  key={owner.name}
                  className="group rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
                >
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={owner.image}
                      alt={t(owner.name)}
                      className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white">
                      <div className="text-sm font-semibold">{t(owner.name)}</div>
                      <div className="text-xs text-white/70">{t(owner.role)}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted leading-relaxed">{t(owner.quote)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 bg-transparent border-t border-border/40 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('FAQ')}</div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
              {t('Answers for growing teams.')}
            </h2>
            <p className="text-muted max-w-2xl mx-auto">
              {t('Everything you need before you start billing clients.')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground">
                  <span>{t(item.question)}</span>
                  <ChevronDown className="w-4 h-4 text-muted transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm text-muted leading-relaxed">{t(item.answer)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-transparent border-t border-border/40 relative">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -top-24 left-1/3 w-72 h-72 bg-primary/10 blur-[140px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
              {t('Pricing that scales with your studio.')}
            </h2>
            <p className="text-muted max-w-2xl mx-auto text-lg">
              {t('Start free, upgrade when you need more automation and analytics.')}
            </p>
          </div>

          <PricingTable t={t} />
        </div>
      </section>

      <Footer t={t} />
    </div>
  );
};

const Footer: React.FC<{ t: (text: string) => string }> = ({ t }) => {
  const navigate = useNavigate();
  return (
    <footer className="relative bg-[#000000] text-white font-sans">
      {/* SECTION 1: CTA WITH 3D VISUALS (Sticky Reveal) */}
      <div className="sticky top-0 h-[700px] flex items-center overflow-hidden bg-[#000000] z-10">
        <div className="max-w-7xl mx-auto px-10 md:px-16 w-full relative h-full flex items-center">
          <div className="max-w-2xl relative z-20">
            <h2 className="text-[48px] md:text-[64px] font-display font-medium tracking-[-0.03em] leading-[1.05] mb-12 text-white">
              {t('Start building')} <br />
              {t('with InvoiceFlow today')}
            </h2>
            <div className="flex flex-wrap gap-5">
              <Button
                onClick={() => navigate({ to: '/onboarding' })}
                className="h-[56px] px-10 rounded-full bg-primary text-black font-bold text-base hover:opacity-90 transition-all border-none"
              >
                {t('Start for free')}
              </Button>
              <Button
                variant="outline"
                className="h-[56px] px-10 rounded-full border-white/20 text-[#FFFFFF] hover:bg-white/10 font-bold text-base transition-all"
              >
                {t('See a demo')} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Background Illustration (Bringing it back) */}
          <div className="absolute right-[-5%] top-0 bottom-0 w-2/3 hidden lg:flex items-center justify-end pointer-events-none select-none">
             <div className="relative w-[600px] h-[500px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-[120px] opacity-40 animate-pulse" />
                <img 
                  src="/dashboard_sync.svg" 
                  alt="Footer Illustration" 
                  className="relative z-10 w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform translate-x-12 translate-y-8"
                />
                {/* 3D Glass Slabs behind the image */}
                <div className="absolute inset-0 flex items-center justify-end gap-6 opacity-30 pr-12">
                   {[0, 1].map(i => (
                     <div 
                       key={i}
                       className="w-[140px] h-[400px] bg-white/[0.03] rounded-[40px] border border-white/10 backdrop-blur-xl transform -rotate-[22deg] skew-x-[-8deg]"
                       style={{ marginTop: `${i * 140}px` }}
                     />
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: THE GLASS OVERLAP FOOTER (Scrolls over Section 1) */}
      <div className="relative z-30 px-4 sm:px-6 lg:px-8 pb-16 flex justify-center bg-transparent">
        {/* The glass card itself needs its own margin-top to start below the viewport of Section 1 */}
        <div className="w-full max-w-[1600px] rounded-[48px] border border-white/10 bg-black/60 backdrop-blur-[120px] shadow-[0_-50px_100px_rgba(0,0,0,1)] overflow-hidden">
          
          <div className="max-w-7xl mx-auto px-10 md:px-16">
            {/* Top Integrated Header Row */}
            <div className="py-12 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[6px] bg-white flex items-center justify-center">
                    <Zap className="w-4 h-4 text-black fill-current" />
                  </div>
                  <span className="font-display font-bold text-[22px] tracking-tight text-white">InvoiceFlow</span>
                </div>
                <span className="text-[13px] text-white/30 pt-1 font-medium tracking-wide ml-2 italic">a Flutterwave company</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/30 font-bold">
                2026 © InvoiceFlow Technologies Nigeria Limited
              </div>
            </div>

            <div className="w-full h-px bg-white/[0.08]" />

            <div className="py-24">
              {/* Nav Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-12 gap-y-24">
                
                {/* Brand/Social Column */}
                <div className="col-span-2 lg:col-span-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-[#2DD4BF] p-3.5 mb-12 shadow-[0_10px_30px_rgba(14,165,164,0.3)] flex items-center justify-center">
                     <Zap className="w-full h-full text-black fill-current" />
                  </div>
                  
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-black mb-6">Get Started</h4>
                      <ul className="space-y-4 text-[15px] font-semibold text-white/60">
                        <li><button onClick={() => navigate({ to: '/onboarding' })} className="hover:text-white transition-colors">Create an account</button></li>
                        <li><button onClick={() => navigate({ to: '/login' })} className="hover:text-white transition-colors">Sign in</button></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-black mb-6">Stay in touch</h4>
                      <div className="flex gap-6">
                        <Twitter className="w-[18px] h-[18px] text-white/30 hover:text-white transition-colors cursor-pointer" />
                        <Instagram className="w-[18px] h-[18px] text-white/30 hover:text-white transition-colors cursor-pointer" />
                        <Linkedin className="w-[18px] h-[18px] text-white/30 hover:text-white transition-colors cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Products')}</h4>
                  <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                    {['Data', 'Payments', 'Statements Pages', 'Payment Pages', 'Prove', 'Lookup', 'Portal', 'Pricing', 'Demo'].map(item => (
                      <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                    ))}
                  </ul>
                </div>

                {/* Use Cases */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Use Cases')}</h4>
                  <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                    {['Customer Onboarding', 'Credit Risk Assessment', 'Payment Collection', 'Personal Finance Insights'].map(item => (
                      <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                    ))}
                  </ul>
                </div>

                {/* Company */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Company')}</h4>
                  <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                    {['About Us', 'Careers', 'Coverage', 'Contact'].map(item => (
                      <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                    ))}
                  </ul>
                </div>

                {/* Developers */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Developers')}</h4>
                  <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                    {['Documentation', 'API Reference', 'SDKs'].map(item => (
                      <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                    ))}
                  </ul>
                  <div className="mt-20">
                     <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Resources')}</h4>
                      <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                        {['Blog', "Partners' Stories", 'Support', 'Consumers'].map(item => (
                          <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                        ))}
                      </ul>
                  </div>
                </div>

                {/* Legal */}
                <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Legal')}</h4>
                    <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                      {["End Users' Policy", 'Developer Policy', 'IMS Policy', 'Terms of Use', 'Disclaimer', 'Cookies', 'Security'].map(item => (
                        <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Disclaimer Section */}
              <div className="mt-32 pt-12 border-t border-white/[0.03]">
                 <p className="text-[11px] leading-[1.8] text-white/20 max-w-5xl tracking-wide">
                   <span className="font-black text-white/30 mr-2 uppercase tracking-widest text-white/40">{t('Disclaimer:')}</span>
                   {t('The information provided on this website is intended for general informational purposes only and does not constitute financial, legal, or professional advice. While we strive to ensure that the content presented is accurate and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability. Our platform is designed to ensure secure access to financial accounts for the purposes of retrieving statements, monitoring transactions in real-time, and verifying customer identities.')}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Landing;
