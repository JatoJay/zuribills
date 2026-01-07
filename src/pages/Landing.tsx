import React, { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input } from '../components/ui';
import ThemeToggle from '../components/ThemeToggle';
import { askBusinessAnalyst } from '@/services/geminiService';
import { useTranslation } from '@/hooks/useTranslation';
import {
  ArrowRight,
  CheckCircle,
  Sparkles,
  Layers,
  MousePointer2,
  BarChart3,
  ShieldCheck,
  Zap,
  Play,
  Bot,
  Wallet,
  ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = ['Product', 'How it works', 'AI insights', 'Pricing'];

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

const PRICING_FEATURES = [
  'Unlimited Invoices',
  'Client Portal',
  'Advanced Analytics',
  'Priority Support',
  'Custom Branding',
  'API Access',
];

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
];

const NavBar: React.FC<{ t: (text: string) => string }> = ({ t }) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed w-full z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-white/40 dark:border-slate-800/60 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate({ to: '/' })}
          >
            <div className="w-9 h-9 rounded-full bg-[#A9F5D9] text-black flex items-center justify-center shadow-soft ring-1 ring-black/10">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
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
            <ThemeToggle />
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
  <div className="relative w-full max-w-[560px] aspect-[6/7]">
    <div className="absolute -top-10 right-4 w-56 h-56 rounded-full bg-primary/20 blur-[120px]" />
    <div className="absolute bottom-8 -left-8 w-64 h-64 rounded-full bg-sky-200/40 dark:bg-sky-500/10 blur-[120px]" />
    <div className="absolute inset-0 rounded-[42px] border border-white/40 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 backdrop-blur-2xl shadow-[0_40px_120px_-60px_rgba(15,23,42,0.6)]" />

    <div className="absolute left-8 top-10 w-44 rounded-3xl border border-white/50 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] -rotate-6">
      <div className="text-[10px] uppercase tracking-widest text-muted">{t('Service')}</div>
      <div className="font-display text-sm text-foreground mt-1">{t('Brand Strategy')}</div>
      <div className="text-xs text-muted mt-2">$2,400</div>
    </div>

    <div className="absolute right-8 top-16 w-44 rounded-3xl border border-white/50 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] rotate-[5deg]">
      <div className="text-[10px] uppercase tracking-widest text-muted">{t('Timeline')}</div>
      <div className="font-display text-sm text-foreground mt-1">{t('3 Weeks')}</div>
      <div className="text-xs text-muted mt-2">{t('Milestones synced')}</div>
    </div>

    <div className="absolute left-10 bottom-24 w-44 rounded-3xl border border-white/50 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)] rotate-[2deg]">
      <div className="text-[10px] uppercase tracking-widest text-muted">{t('Invoice')}</div>
      <div className="font-display text-sm text-foreground mt-1">{t('INV-1042')}</div>
      <div className="text-xs text-muted mt-2">{t('Sent in 2s')}</div>
    </div>

    <div className="absolute right-10 bottom-10 w-48 rounded-3xl border border-foreground/10 bg-foreground text-background p-4 shadow-lift">
      <div className="text-[10px] uppercase tracking-widest text-background/60">{t('Status')}</div>
      <div className="font-display text-sm text-background mt-1">{t('Paid')}</div>
      <div className="text-xs text-primary mt-2">{t('Cleared instantly')}</div>
    </div>

    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="w-28 h-28 rounded-full bg-primary text-[var(--on-primary)] flex items-center justify-center font-display text-sm uppercase tracking-widest shadow-soft">
        {t('Pay')}
      </div>
    </div>
  </div>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; className?: string }> = ({
  icon,
  title,
  description,
  className = '',
}) => (
  <div className={`p-6 rounded-3xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl text-foreground shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] transition-transform duration-300 hover:-translate-y-1 ${className}`}>
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
    <div className="bg-white/70 dark:bg-slate-900/60 rounded-3xl border border-white/40 dark:border-slate-700/60 backdrop-blur-xl p-4 shadow-lift max-w-md mx-auto relative z-10">
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
            : 'bg-white/70 dark:bg-slate-950/60 border-white/40 dark:border-slate-700/60 text-muted hover:text-foreground'
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
                : 'bg-white/80 dark:bg-slate-900/70 border border-white/40 dark:border-slate-700/60 text-foreground rounded-tl-none'
                }`}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="bg-white/80 dark:bg-slate-900/70 border border-white/40 dark:border-slate-700/60 text-muted px-4 py-2 rounded-2xl rounded-tl-none">
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
        className="h-10 bg-white/70 dark:bg-slate-950/60 border border-white/40 dark:border-slate-700/60 rounded-full flex-1 px-4 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-center mb-12">
        <div className="bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-700/60 backdrop-blur-xl p-1 rounded-full flex relative shadow-soft">
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
        <div className={`relative p-8 rounded-3xl border transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-foreground/90 text-background border-primary shadow-lift scale-[1.02] z-10 backdrop-blur-xl' : 'bg-white/70 dark:bg-slate-900/60 border-white/40 dark:border-slate-700/60 backdrop-blur-xl hover:border-primary/30'}`}>
          <h3 className="text-xl font-display font-semibold mb-2">{t('Monthly Plan')}</h3>
          <p className="text-sm opacity-80 mb-6">{t('Perfect for short-term projects and starters.')}</p>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-display font-semibold">$4.99</span>
            <span className="text-sm opacity-70">/mo</span>
          </div>
          <ul className="space-y-4 mb-8">
            {PRICING_FEATURES.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-primary" /> {t(feat)}
              </li>
            ))}
          </ul>
          <Button
            variant={billingCycle === 'monthly' ? 'primary' : 'outline'}
            className="w-full"
          >
            {t('Choose Monthly')}
          </Button>
        </div>

        <div className={`relative p-8 rounded-3xl border transition-all duration-300 ${billingCycle === 'yearly' ? 'bg-foreground/90 text-background border-primary shadow-lift scale-[1.02] z-10 backdrop-blur-xl' : 'bg-white/70 dark:bg-slate-900/60 border-white/40 dark:border-slate-700/60 backdrop-blur-xl hover:border-primary/30'}`}>
          {billingCycle === 'yearly' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-[var(--on-primary)] text-xs font-bold px-3 py-1 rounded-full shadow-soft">
              {t('MOST POPULAR')}
            </div>
          )}
          <h3 className="text-xl font-display font-semibold mb-2">{t('Yearly Plan')}</h3>
          <p className="text-sm opacity-80 mb-6">{t('Best value for growing businesses.')}</p>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-display font-semibold">$4.50</span>
            <span className="text-sm opacity-70">/mo</span>
          </div>
          <p className="text-xs opacity-70 -mt-4 mb-6">{t('Billed $54 yearly')}</p>
          <ul className="space-y-4 mb-8">
            {PRICING_FEATURES.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-primary" /> {t(feat)}
              </li>
            ))}
          </ul>
          <Button
            variant={billingCycle === 'yearly' ? 'primary' : 'outline'}
            className="w-full"
          >
            {t('Choose Yearly')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Footer: React.FC<{ t: (text: string) => string }> = ({ t }) => (
  <footer className="py-12 bg-[#0b0b0b] text-white">
    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-display font-semibold tracking-tight">InvoiceFlow</span>
      </div>
      <div className="flex gap-8 text-sm">
        <a href="#" className="transition-colors hover:text-white">{t('Privacy')}</a>
        <a href="#" className="transition-colors hover:text-white">{t('Terms')}</a>
        <a href="#" className="transition-colors hover:text-white">{t('Docs')}</a>
      </div>
      <div className="text-xs">
        &copy; {new Date().getFullYear()} InvoiceFlow. {t('All rights reserved.')}
      </div>
    </div>
  </footer>
);

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const translationStrings = useMemo(() => ([
    ...NAV_ITEMS,
    'Sign in',
    'Start free',
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
    'Privacy',
    'Terms',
    'Docs',
    'All rights reserved.',
  ]), []);
  const { t } = useTranslation(translationStrings);
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-black overflow-x-hidden">
      <NavBar t={t} />

      <section className="relative pt-36 pb-28 bg-[radial-gradient(circle_at_top,_#eef9ff_0%,_#f7fff9_45%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,_#0b1311_0%,_#060b12_55%,_#05070d_100%)] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-24 right-0 w-[520px] h-[520px] bg-primary/25 blur-[160px]" />
        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] bg-sky-200/40 dark:bg-sky-500/10 blur-[140px]" />

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

            <div id="admin-signin" className="mt-10 rounded-3xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 shadow-soft max-w-md">
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
        <div className="absolute inset-0 bg-grid opacity-15" />
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

      <section id="how-it-works" className="py-24 bg-transparent relative">
        <div className="absolute inset-0 bg-spotlight opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('How it works')}</div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold">{t('From setup to payment in three moves.')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div key={item.step} className="p-6 rounded-3xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
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
              <div className="relative shadow-lift rounded-3xl border border-white/40 dark:border-slate-800/60 overflow-hidden bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl">
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
                  className="group rounded-3xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
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

      <section id="faq" className="py-24 bg-transparent border-t border-border/40 relative">
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
                className="group rounded-3xl border border-white/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
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

export default Landing;
