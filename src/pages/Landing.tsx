import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input } from '../components/ui';
import { askBusinessAnalyst } from '@/services/geminiService';
import { useTranslation } from '@/hooks/useTranslation';
import { useParallax } from '@/hooks/useParallax';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
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
  ChevronDown,
  Bot,
  Languages,
  MessageSquare
} from 'lucide-react';

const NAV_ITEMS = ['Features', 'How it works', 'AI Assistant', 'FAQ', 'Pricing'];

const HERO_HIGHLIGHTS = ['No credit card required', 'Setup in 2 minutes', 'Instant payment links'];

const PRODUCT_FEATURES = [
  {
    category: 'Sales & Branding',
    categoryIcon: <Layers className="w-4 h-4 text-emerald-500" />,
    brand: 'Client Catalogs',
    title: 'Professional service catalogs that convert browsers to buyers',
    description: 'Build stunning digital catalogs that showcase your services, packages, and pricing. Share a single link and let clients explore, select, and pay, all in one seamless experience.',
    image: '/features/catalog-mock.png',
    bgColor: 'bg-emerald-500/5',
    labelColor: 'text-emerald-500',
  },
  {
    category: 'Automation',
    categoryIcon: <Bot className="w-4 h-4 text-blue-500" />,
    brand: 'AI Payment Agent',
    title: 'Automated follow-ups that recover 40% more overdue payments',
    description: 'Your AI assistant monitors every invoice 24/7. It detects overdue payments, drafts personalized reminder emails, and helps you get paid faster without lifting a finger.',
    image: '/features/ai-mock.png',
    bgColor: 'bg-blue-500/5',
    labelColor: 'text-blue-500',
  },
  {
    category: 'Payments',
    categoryIcon: <Zap className="w-4 h-4 text-orange-500" />,
    brand: 'Instant Payouts',
    title: 'Get paid instantly. No more waiting 3-5 business days',
    description: 'Accept cards, bank transfers, and mobile money. When clients pay, funds hit your bank account or mobile wallet in real-time. No delays, no hassle.',
    image: '/features/payment-mock.png',
    bgColor: 'bg-orange-500/5',
    labelColor: 'text-orange-500',
  },
  {
    category: 'Intelligence',
    categoryIcon: <BarChart3 className="w-4 h-4 text-teal-500" />,
    brand: 'Business Intelligence',
    title: 'Tax-ready reports and cash flow insights in one dashboard',
    description: 'Track revenue, expenses, and profit margins at a glance. Generate professional financial reports for tax filing, audits, or investor meetings, all automatically.',
    image: '/features/analytics-mock.png',
    bgColor: 'bg-teal-500/5',
    labelColor: 'text-teal-500',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Create your service catalog',
    description: 'Add your services, set pricing, and customize your brand in under 5 minutes.',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    step: '02',
    title: 'Share & get paid instantly',
    description: 'Send your catalog link via WhatsApp, email, or social media. Clients pay online.',
    icon: <MousePointer2 className="w-5 h-5" />,
  },
  {
    step: '03',
    title: 'Track everything automatically',
    description: 'Monitor payments, expenses, and generate tax-ready reports effortlessly.',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
];

const AI_BULLETS = [
  'Ask questions in plain English and get instant answers',
  'Automatic overdue payment detection and alerts',
  'AI-drafted follow-up emails that get responses',
  'Revenue forecasting and business trend insights',
];

const ANALYTICS_BULLETS = [
  'Real-time revenue dashboard with visual charts',
  'Expense tracking with receipt uploads and vendor history',
  'One-click export for monthly and yearly tax reports',
];


const LOCAL_LANGUAGES = [
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'sw', label: 'Swahili' },
  { code: 'tw', label: 'Twi' },
  { code: 'yo', label: 'Yoruba, Hausa, Igbo' },
  { code: 'zu', label: 'Zulu' },
];

const PRICING_FEATURES = [
  'Unlimited invoices & clients',
  'AI-powered payment reminders',
  'Professional client portal',
  'Tax-ready financial reports',
  'Custom branding & logo',
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

const AUDIENCE_CARDS = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Freelancers & Creatives',
    description: 'Designers, photographers, writers, and consultants who need professional invoicing without the complexity.',
    stat: 'Get paid 3x faster',
    color: 'blue',
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Small Business Owners',
    description: 'Boutiques, salons, restaurants, and shops that want to track sales, expenses, and stay tax-ready.',
    stat: 'Save 10+ hrs/month',
    color: 'emerald',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Artisans & Makers',
    description: 'Tailors, bakers, craftspeople who sell custom work and need simple catalog and payment tools.',
    stat: 'Zero learning curve',
    color: 'orange',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do clients pay my invoices?',
    answer: 'Share your invoice or catalog link via WhatsApp, email, or SMS. Clients pay securely with cards, bank transfer, or mobile money. Payment status updates automatically.',
  },
  {
    question: 'Can my team access the platform?',
    answer: 'Yes! Invite unlimited team members with role-based permissions. Control who can view invoices, manage expenses, or access financial reports.',
  },
  {
    question: 'Do you support multiple currencies?',
    answer: 'Absolutely. Bill clients in their local currency and receive payouts in yours. We support USD, NGN, GHS, KES, ZAR, GBP, EUR, and more.',
  },
  {
    question: 'How secure is my financial data?',
    answer: 'Bank-level security with 256-bit encryption, row-level database security, and SOC 2 compliant infrastructure. Your data is never shared or sold.',
  },
  {
    question: 'Do I need accounting experience?',
    answer: 'Not at all! ZuriBills is designed for non-accountants. Our AI assistant helps you understand your finances and generates professional reports automatically.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! Start with a 3-day free trial with full access to all features. No credit card required. Cancel anytime.',
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
    <nav className="fixed w-full z-[100] bg-white/80 backdrop-blur-2xl border-b border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate({ to: '/' })}
          >
            <img src="/logo.svg" alt="ZuriBills" className="w-9 h-9" />
            <span className="font-display text-lg font-semibold tracking-tight">
              <span className="text-black">Zuri</span><span className="text-primary">Bills</span>
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
            <div className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3 py-1.5 text-xs text-muted shadow-sm hover:shadow-md transition-shadow duration-300">
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
              onClick={() => navigate({ to: '/signup' })}
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

const PhoneMockupContent: React.FC<{ featureIndex: number; t: any }> = ({ featureIndex, t: _t }) => {
  if (featureIndex === 0) {
    return (
      <div className="h-full bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-black">My Catalog</span>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2 overflow-hidden">
          {[
            { name: 'Brand Strategy', price: '$2,400', color: 'bg-emerald-500' },
            { name: 'Web Design', price: '$1,800', color: 'bg-blue-500' },
            { name: 'SEO Audit', price: '$500', color: 'bg-purple-500' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center`}>
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-900 truncate">{item.name}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-900">{item.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="p-3 pt-1">
          <button className="w-full h-9 bg-emerald-500 rounded-lg text-white font-bold text-[10px]">
            Share Catalog Link
          </button>
        </div>
      </div>
    );
  }

  if (featureIndex === 1) {
    return (
      <div className="h-full bg-gradient-to-b from-blue-50 to-white flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-black">AI Agent</span>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2 overflow-hidden">
          <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <p className="text-[9px] text-black leading-relaxed font-medium">
                  <span className="font-bold">INV-1042</span> is 3 days overdue.
                </p>
                <p className="text-[9px] text-blue-600 font-semibold mt-0.5">Send a reminder?</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="flex-1 h-8 bg-blue-500 rounded-lg text-white font-bold text-[9px]">
              Send
            </button>
            <button className="flex-1 h-8 bg-slate-100 rounded-lg text-slate-700 font-bold text-[9px]">
              View
            </button>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2.5 text-white">
            <p className="text-[8px] opacity-90">This Week</p>
            <p className="text-[16px] font-bold">$3,450</p>
            <p className="text-[8px] opacity-90">↑ 15%</p>
          </div>
        </div>
      </div>
    );
  }

  if (featureIndex === 2) {
    return (
      <div className="h-full bg-gradient-to-b from-orange-50 to-white flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-black">Payment</span>
          </div>
        </div>
        <div className="flex-1 p-3 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm text-center flex-1 flex flex-col justify-center">
            <motion.div
              className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
            </motion.div>
            <p className="text-[8px] text-slate-600 uppercase tracking-wider font-semibold">Confirmed</p>
            <p className="text-[18px] font-bold text-slate-900">$1,200</p>
            <p className="text-[9px] text-slate-600 font-medium">Acme Corp</p>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <Zap className="w-3 h-3" />
                <span className="text-[9px] font-bold">Instant</span>
              </div>
            </div>
          </div>
          <div className="mt-2 bg-orange-50 rounded-lg p-2 border border-orange-100">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-orange-700 font-medium">Today</span>
              <span className="text-[10px] font-bold text-orange-700">$2,840</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-b from-teal-50 to-white flex flex-col">
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center">
            <BarChart3 className="w-3 h-3 text-white" />
          </div>
          <span className="text-[11px] font-bold text-black">Analytics</span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-hidden">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-white rounded-md border border-slate-200 p-1.5 shadow-sm">
            <p className="text-[7px] text-slate-600 uppercase font-bold">Revenue</p>
            <p className="text-[12px] font-black text-black">$12.4k</p>
            <p className="text-[8px] text-green-600 font-bold">↑ 22%</p>
          </div>
          <div className="bg-white rounded-md border border-slate-200 p-1.5 shadow-sm">
            <p className="text-[7px] text-slate-600 uppercase font-bold">Expenses</p>
            <p className="text-[12px] font-black text-black">$3.2k</p>
            <p className="text-[8px] text-red-600 font-bold">↑ 8%</p>
          </div>
        </div>
        <div className="bg-white rounded-md border border-slate-200 p-2 shadow-sm">
          <p className="text-[8px] text-slate-700 mb-1 font-bold">Cash Flow</p>
          <div className="flex items-end gap-0.5 h-10">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-teal-500 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              />
            ))}
          </div>
        </div>
        <div className="bg-teal-100 rounded-md p-2 border border-teal-200">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-teal-800 font-bold">Net profit</span>
            <span className="text-[10px] font-black text-teal-800">$9.2k</span>
          </div>
        </div>
      </div>
      <div className="p-3 pt-1">
        <button className="w-full h-8 bg-teal-500 rounded-lg text-white font-bold text-[9px]">
          Export Report
        </button>
      </div>
    </div>
  );
};

const StackedFeatureCard: React.FC<{
  feature: typeof PRODUCT_FEATURES[0];
  index: number;
  totalCards: number;
  scrollProgress: MotionValue<number>;
  t: any
}> = ({ feature, index, totalCards, scrollProgress, t }) => {
  const segmentSize = 1 / totalCards;
  const cardStart = index * segmentSize;

  const y = useTransform(
    scrollProgress,
    [cardStart - segmentSize * 0.8, cardStart],
    [100, 0]
  );

  const clampedY = useTransform(y, (value) => `${Math.max(0, value)}%`);

  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full flex items-center justify-center px-4 md:px-8"
      style={{ zIndex: index + 1, y: clampedY }}
    >
      <div
        className="relative w-full max-w-[1200px] h-[80vh] max-h-[680px] rounded-[28px] bg-[#f8f8f6] border border-black/[0.06] shadow-[0_8px_60px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        <div className="absolute inset-0 flex flex-col lg:flex-row">
          <div className="absolute top-6 left-8 z-20 flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-md ${feature.bgColor} flex items-center justify-center`}>
              {React.cloneElement(feature.categoryIcon as React.ReactElement, { className: 'w-3 h-3' })}
            </div>
            <span className="text-[12px] font-semibold text-slate-500 tracking-wide">
              {t(feature.category)}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 lg:px-14 pt-20 pb-10 lg:pt-10 lg:pb-10 relative z-10">
            <div className="max-w-lg">
              <div className="bg-white rounded-[24px] border border-black/[0.04] p-8 lg:p-10 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-5">
                  <div className={`w-6 h-6 rounded-lg ${feature.bgColor} flex items-center justify-center`}>
                    {React.cloneElement(feature.categoryIcon as React.ReactElement, { className: `w-3.5 h-3.5 ${feature.labelColor}` })}
                  </div>
                  <span className={`text-[12px] font-semibold ${feature.labelColor}`}>
                    {t(feature.category)}
                  </span>
                </div>

                <h3 className={`font-display font-bold text-xl lg:text-2xl mb-4 tracking-tight ${feature.labelColor}`}>
                  {t(feature.brand)}
                </h3>

                <h2 className="text-[28px] lg:text-[36px] font-display font-semibold tracking-[-0.02em] leading-[1.15] mb-5 text-[#0b0b0b]">
                  {t(feature.title)}
                </h2>

                <p className="text-[15px] text-slate-500 leading-relaxed mb-6">
                  {t(feature.description)}
                </p>

                <a href="#" className={`inline-flex items-center gap-2 font-semibold text-[14px] hover:gap-3 transition-all group/link ${feature.labelColor}`}>
                  {t('Learn more')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                </a>
              </div>

              <button
                onClick={() => window.location.href = '/signup'}
                className="mt-6 h-12 px-7 bg-[#0b0b0b] text-white rounded-xl font-semibold text-[14px] hover:bg-[#1a1a1a] transition-colors shadow-lg"
              >
                {t(`Start with ${feature.brand}`)}
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`absolute w-[400px] h-[400px] rounded-full border ${feature.labelColor.replace('text-', 'border-')}/20`} />
              <div className={`absolute w-[300px] h-[300px] rounded-full border ${feature.labelColor.replace('text-', 'border-')}/15`} />
              <div className={`absolute w-[200px] h-[200px] rounded-full border ${feature.labelColor.replace('text-', 'border-')}/10`} />
            </div>

            <motion.div
              className="absolute top-[15%] left-[8%] w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className={`w-9 h-9 rounded-xl ${feature.labelColor.replace('text-', 'bg-')} flex items-center justify-center`}>
                {React.cloneElement(feature.categoryIcon as React.ReactElement, { className: 'w-5 h-5 text-white' })}
              </div>
            </motion.div>

            <motion.div
              className={`absolute bottom-[25%] left-[5%] w-12 h-12 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center justify-center ${feature.labelColor.replace('text-', 'bg-')}`}
              animate={{ y: [0, 8, 0], x: [0, 4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <ArrowRight className="w-5 h-5 -rotate-45 text-white" />
            </motion.div>

            <motion.div
              className="absolute top-[40%] right-[5%] w-10 h-10 rounded-full bg-white border-2 border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center"
              animate={{ y: [0, 6, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            >
              <CheckCircle className={`w-5 h-5 ${feature.labelColor}`} />
            </motion.div>

            <div className="relative z-10 w-[200px] h-[420px]">
              <div className="absolute inset-0 bg-[#1a1a1a] rounded-[36px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1a1a] rounded-b-2xl z-20" />
                <div className="absolute inset-[3px] bg-white rounded-[33px] overflow-hidden">
                  <div className="flex items-center justify-between px-5 pt-2 pb-1">
                    <span className="text-[10px] font-semibold text-black">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-2 rounded-sm border border-black/80 relative">
                        <div className="absolute inset-[1px] right-[1px] bg-black rounded-[1px]" />
                      </div>
                    </div>
                  </div>
                  <PhoneMockupContent featureIndex={index} t={t} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalCards }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? 'bg-[#0b0b0b] scale-125'
                    : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 text-slate-400 rotate-180" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#0b0b0b] hover:bg-[#1a1a1a] flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FeatureSlider: React.FC<{ t: any }> = ({ t }) => {
  const totalCards = PRODUCT_FEATURES.length;
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      ref={containerRef as React.RefObject<HTMLElement>}
      className="relative"
      style={{ height: `${totalCards * 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {PRODUCT_FEATURES.map((feature, index) => (
          <StackedFeatureCard
            key={feature.brand}
            feature={feature}
            index={index}
            totalCards={totalCards}
            scrollProgress={scrollYProgress}
            t={t}
          />
        ))}
      </div>
    </section>
  );
};

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
    <div className="bg-white/95 rounded-3xl border border-black/[0.06] backdrop-blur-2xl p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] max-w-md mx-auto relative z-10 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] transition-shadow duration-500">
      <div className="flex items-center justify-between border-b border-foreground/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-foreground">{t('ZuriBills AI')}</div>
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
  const [localCurrency, setLocalCurrency] = useState<{ code: string; symbol: string }>({ code: 'USD', symbol: '$' });
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [loadingRate, setLoadingRate] = useState(true);

  useEffect(() => {
    const loadCurrencyData = async () => {
      try {
        const { detectLocationLanguage, fetchExchangeRate } = await import('@/services/geolocation');
        const geoResult = await detectLocationLanguage();
        if (geoResult && geoResult.currency.code !== 'USD') {
          setLocalCurrency(geoResult.currency);
          const rate = await fetchExchangeRate('USD', geoResult.currency.code);
          if (rate) {
            setExchangeRate(rate);
          } else {
            setLocalCurrency({ code: 'USD', symbol: '$' });
            setExchangeRate(1);
          }
        }
      } catch (error) {
        console.warn('Failed to load currency data:', error);
        setLocalCurrency({ code: 'USD', symbol: '$' });
        setExchangeRate(1);
      } finally {
        setLoadingRate(false);
      }
    };
    loadCurrencyData();
  }, []);

  const formatPrice = (usdPrice: number) => {
    const localPrice = usdPrice * exchangeRate;
    const formatted = localPrice >= 1000
      ? localPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : localPrice.toFixed(2);
    return `${localCurrency.symbol}${formatted}`;
  };

  const handleSelectPlan = (planId: string) => {
    navigate({
      to: '/signup',
      search: { plan: planId } as any
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-center mb-12">
        <div className="bg-white/95 border border-black/[0.06] backdrop-blur-xl p-1.5 rounded-full flex relative shadow-lg">
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

      <div className="max-w-md mx-auto py-6">
        <div className="relative p-8 rounded-3xl border bg-white border-primary/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)]">
          {billingCycle === 'yearly' && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-[var(--on-primary)] text-xs font-bold px-3 py-1 rounded-full shadow-soft">
              {t('MOST POPULAR')}
            </div>
          )}
          <h3 className="text-xl font-display font-semibold mb-2" style={{ color: '#0f172a' }}>
            {billingCycle === 'monthly' ? t('Monthly Plan') : t('Yearly Plan')}
          </h3>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>
            {billingCycle === 'monthly' ? t('Perfect for short-term projects and starters.') : t('Best value for growing businesses.')}
          </p>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-display font-semibold" style={{ color: '#0f172a' }}>
              {loadingRate ? (billingCycle === 'monthly' ? '$2' : '$1.67') : formatPrice(billingCycle === 'monthly' ? 2 : 1.67)}
            </span>
            <span className="text-sm" style={{ color: '#64748b' }}>/mo</span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-xs mb-6" style={{ color: '#64748b' }}>
              {loadingRate ? t('Billed $20 yearly') : `${t('Billed')} ${formatPrice(20)} ${t('yearly')}`}
            </p>
          )}
          {billingCycle === 'monthly' && <div className="mb-6" />}
          <ul className="space-y-4 mb-8">
            {PRICING_FEATURES.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm" style={{ color: '#0f172a' }}>
                <CheckCircle className="w-5 h-5 text-primary" /> {t(feat)}
              </li>
            ))}
          </ul>
          <div className="mb-4">
            <span className="text-xs" style={{ color: '#64748b' }}>
              {t('3-day free trial included')}
            </span>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => handleSelectPlan(billingCycle)}
          >
            {billingCycle === 'monthly' ? t('Choose Monthly') : t('Choose Yearly')}
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
    'ZuriBills AI',
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
    'Billed',
    'yearly',
    'MOST POPULAR',
    'Choose Monthly',
    'Choose Yearly',
    ...PRICING_FEATURES,
    'Built for growing businesses, freelancers & artisans',
    'Be in control',
    'from services to paid invoices',
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
    ...PRODUCT_FEATURES.flatMap(feature => [feature.title, feature.description, feature.category, feature.brand]),
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
    'ZuriBills localizes catalogs, invoices, and payment prompts for every payout country, including Rwanda, Kenya, Ghana, South Africa, Nigeria, UK, US, and Canada.',
    'Video overview',
    'Payout-ready languages',
    'Local language support preview',
    ...LOCAL_LANGUAGES.flatMap(language => [language.label]),
    'Analytics',
    'Everything you need to run the back office.',
    'Track revenue, manage expenses, and export tax-ready cash-flow reports with a dashboard designed for clarity.',
    ...ANALYTICS_BULLETS,
    'Admin Dashboard Interface',
    'Who We Serve',
    'Built for people who do real work',
    'Whether you run a boutique, freelance on the side, or craft custom pieces, ZuriBills helps you look professional and get paid faster.',
    ...AUDIENCE_CARDS.flatMap(card => [card.title, card.description]),
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
    'Take Control of your Business Finances.',
    'Get Started With ZuriBills',
    'Sales & Branding',
    'Automation',
    'Intelligence',
    'Confirm',
    'Learn more',
    'Get started'
  ]), []);
  const { t, language, setLanguage, isTranslating } = useTranslation(translationStrings);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [language, isTranslating]);

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
      className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-black"
      style={{ ...LIGHT_THEME, overflowX: 'clip' } as React.CSSProperties}
    >
      <NavBar
        t={t}
        language={language}
        languages={languageOptions}
        onLanguageChange={handleLanguageChange}
      />

      <section className="relative pt-40 pb-32 bg-gradient-to-b from-white via-white to-slate-50/50 overflow-hidden">
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
              {t('Built for growing businesses, freelancers & artisans')}
            </div>
            <h1 className="text-5xl md:text-[3.5rem] lg:text-6xl font-display font-bold leading-[1.1] tracking-tight mb-6">
              {t('Be in control')}: <br className="hidden md:block" /><span className="bg-gradient-to-r from-primary via-primary to-emerald-500 bg-clip-text text-transparent">{t('from services to paid invoices')}</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl leading-relaxed">
              {t('One canvas for services, expenses, pricing, checkout, and follow-ups. Share a beautiful catalog, get paid faster, and file taxes with clean inflow/outflow reports.')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => navigate({ to: '/signup' })} className="px-8 h-12 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300">
                {t('Start free')}
              </Button>
              <Button variant="outline" className="px-8 h-12 text-base hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:scale-[1.02] transition-all duration-300">
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
                  <button onClick={() => navigate({ to: '/signup' })} className="text-foreground underline decoration-primary/60 underline-offset-4">
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

      <section id="product" className="bg-transparent relative">
        <div className="absolute -top-20 right-8 w-64 h-64 bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative py-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('Product')}</div>
              <h2 className="text-4xl md:text-5xl font-display font-semibold">
                {t('A single canvas for every client touchpoint.')}
              </h2>
            </div>
            <p className="text-muted max-w-xl text-lg">
              {t('Replace scattered tools with a focused experience. Your catalog, invoices, expenses, and payments live in one place.')}
            </p>
          </div>
        </div>
        <FeatureSlider t={t} />
      </section>

      <section id="how-it-works" className="py-28 bg-gradient-to-b from-slate-50/50 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-muted mb-4">{t('How it works')}</div>
            <h2 className="text-3xl md:text-4xl font-display font-semibold">{t('From setup to payment in three moves.')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div key={item.step} className="group p-6 rounded-3xl border border-black/[0.04] bg-white/90 backdrop-blur-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:border-primary/20 hover:-translate-y-1 transition-all duration-500 cursor-pointer">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs uppercase tracking-widest text-muted">{item.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{t(item.title)}</h3>
                <p className="text-sm text-muted">{t(item.description)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai-assistant" className="py-28 bg-white relative overflow-hidden">
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

      <section id="local-languages" className="py-28 bg-gradient-to-b from-white to-slate-50/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="relative overflow-hidden rounded-[32px] border border-white/40 shadow-lift min-h-[420px]">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30">
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
                  <defs>
                    <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0EA5A4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0EA5A4" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="bubbleGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="white" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="bubbleGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0EA5A4" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0EA5A4" stopOpacity="0.08" />
                    </linearGradient>
                  </defs>

                  <circle cx="900" cy="300" r="220" fill="url(#globeGrad)" opacity="0.6" />
                  <circle cx="900" cy="300" r="220" stroke="white" strokeWidth="1" fill="none" opacity="0.15" />
                  <ellipse cx="900" cy="300" rx="220" ry="80" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" />
                  <ellipse cx="900" cy="300" rx="80" ry="220" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" />
                  <ellipse cx="900" cy="300" rx="150" ry="220" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" transform="rotate(30 900 300)" />
                  <ellipse cx="900" cy="300" rx="150" ry="220" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" transform="rotate(-30 900 300)" />

                  <g className="animate-pulse" style={{ animationDuration: '4s' }}>
                    <circle cx="780" cy="200" r="6" fill="#0EA5A4" opacity="0.8" />
                    <circle cx="950" cy="180" r="4" fill="#0EA5A4" opacity="0.6" />
                    <circle cx="1020" cy="280" r="5" fill="#0EA5A4" opacity="0.7" />
                    <circle cx="850" cy="400" r="4" fill="#0EA5A4" opacity="0.6" />
                    <circle cx="980" cy="380" r="6" fill="#0EA5A4" opacity="0.8" />
                    <circle cx="820" cy="320" r="3" fill="#0EA5A4" opacity="0.5" />
                  </g>

                  <g opacity="0.9">
                    <rect x="80" y="80" width="140" height="70" rx="16" fill="url(#bubbleGrad1)" />
                    <path d="M120 150 L130 165 L140 150" fill="url(#bubbleGrad1)" />
                    <text x="110" y="115" fill="white" fontSize="14" fontFamily="system-ui" fontWeight="500" opacity="0.9">Muraho!</text>
                    <text x="100" y="135" fill="white" fontSize="10" fontFamily="system-ui" opacity="0.6">Kinyarwanda</text>
                  </g>

                  <g opacity="0.85">
                    <rect x="60" y="220" width="130" height="65" rx="14" fill="url(#bubbleGrad2)" />
                    <path d="M90 285 L100 298 L110 285" fill="url(#bubbleGrad2)" />
                    <text x="85" y="252" fill="white" fontSize="13" fontFamily="system-ui" fontWeight="500" opacity="0.9">Habari!</text>
                    <text x="80" y="270" fill="white" fontSize="9" fontFamily="system-ui" opacity="0.6">Swahili</text>
                  </g>

                  <g opacity="0.8">
                    <rect x="100" y="360" width="120" height="60" rx="12" fill="url(#bubbleGrad1)" />
                    <path d="M130 420 L140 432 L150 420" fill="url(#bubbleGrad1)" />
                    <text x="125" y="390" fill="white" fontSize="12" fontFamily="system-ui" fontWeight="500" opacity="0.9">Akwaaba</text>
                    <text x="128" y="408" fill="white" fontSize="9" fontFamily="system-ui" opacity="0.6">Twi</text>
                  </g>

                  <g opacity="0.75">
                    <rect x="250" y="160" width="110" height="55" rx="12" fill="url(#bubbleGrad2)" />
                    <text x="270" y="188" fill="white" fontSize="11" fontFamily="system-ui" fontWeight="500" opacity="0.9">Sawubona</text>
                    <text x="278" y="203" fill="white" fontSize="8" fontFamily="system-ui" opacity="0.6">Zulu</text>
                  </g>

                  <g opacity="0.7">
                    <rect x="280" y="420" width="100" height="50" rx="10" fill="url(#bubbleGrad1)" />
                    <text x="300" y="446" fill="white" fontSize="11" fontFamily="system-ui" fontWeight="500" opacity="0.9">Sannu</text>
                    <text x="302" y="460" fill="white" fontSize="8" fontFamily="system-ui" opacity="0.6">Hausa</text>
                  </g>

                  <g opacity="0.65">
                    <rect x="400" y="100" width="90" height="45" rx="10" fill="url(#bubbleGrad2)" />
                    <text x="418" y="124" fill="white" fontSize="10" fontFamily="system-ui" fontWeight="500" opacity="0.9">Nnọọ</text>
                    <text x="425" y="138" fill="white" fontSize="8" fontFamily="system-ui" opacity="0.6">Igbo</text>
                  </g>

                  <line x1="220" y1="115" x2="780" y2="200" stroke="white" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                  <line x1="190" y1="252" x2="820" y2="320" stroke="white" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                  <line x1="220" y1="390" x2="850" y2="400" stroke="white" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
                  <line x1="360" y1="187" x2="950" y2="180" stroke="white" strokeWidth="0.5" opacity="0.08" strokeDasharray="4 4" />
                  <line x1="380" y1="445" x2="980" y2="380" stroke="white" strokeWidth="0.5" opacity="0.08" strokeDasharray="4 4" />

                  <circle cx="150" cy="500" r="80" stroke="white" strokeWidth="0.3" fill="none" opacity="0.1" />
                  <circle cx="500" cy="550" r="60" stroke="#0EA5A4" strokeWidth="0.3" fill="none" opacity="0.15" />
                  <circle cx="650" cy="50" r="40" stroke="white" strokeWidth="0.3" fill="none" opacity="0.1" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40" />
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
                  {t('ZuriBills localizes catalogs, invoices, and payment prompts for every payout country, including Rwanda, Kenya, Ghana, South Africa, Nigeria, UK, US, and Canada.')}
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
                      <div className="mt-1 flex items-center gap-1 text-white/50 text-[10px]">
                        <MessageSquare className="w-3 h-3" />
                        <span>Native support</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full border border-white/50 bg-white/10 flex items-center justify-center">
                      <Languages className="w-4 h-4 text-white" />
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

      <section className="py-28 bg-gradient-to-b from-white to-slate-50/80 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-4">{t('Who We Serve')}</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-slate-900">
              {t('Built for people who do real work')}
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto">
              {t('Whether you run a boutique, freelance on the side, or craft custom pieces, ZuriBills helps you look professional and get paid faster.')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {AUDIENCE_CARDS.map((card, index) => {
              const colorClasses: Record<string, { iconBg: string; iconText: string; statBg: string; statText: string; statBorder: string; hoverBorder: string }> = {
                blue: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', statBg: 'bg-blue-50', statText: 'text-blue-700', statBorder: 'border-blue-200', hoverBorder: 'hover:border-blue-300' },
                emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', statBg: 'bg-emerald-50', statText: 'text-emerald-700', statBorder: 'border-emerald-200', hoverBorder: 'hover:border-emerald-300' },
                orange: { iconBg: 'bg-orange-100', iconText: 'text-orange-600', statBg: 'bg-orange-50', statText: 'text-orange-700', statBorder: 'border-orange-200', hoverBorder: 'hover:border-orange-300' },
              };
              const colors = colorClasses[card.color] || colorClasses.blue;

              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6 }}
                  className="group"
                >
                  <div className={`relative h-full rounded-3xl border border-slate-200/80 bg-white p-8 transition-all duration-500 ${colors.hoverBorder} hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)]`}>
                    <div className={`w-14 h-14 rounded-2xl ${colors.iconBg} ${colors.iconText} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}>
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-900">{t(card.title)}</h3>
                    <p className="text-slate-500 text-[15px] leading-relaxed mb-6">{t(card.description)}</p>
                    <div className={`inline-flex items-center rounded-full ${colors.statBg} border ${colors.statBorder} px-4 py-2`}>
                      <CheckCircle className={`w-4 h-4 mr-2 ${colors.statText}`} />
                      <span className={`text-sm font-semibold ${colors.statText}`}>{card.stat}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="py-28 bg-gradient-to-b from-slate-50/50 to-white relative overflow-hidden">
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
                className="group rounded-3xl border border-black/[0.04] bg-white/95 backdrop-blur-xl p-6 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.1)] hover:border-primary/20 transition-all duration-300"
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

      <section id="pricing" className="py-28 bg-white relative">
        <div className="absolute -top-24 left-1/3 w-72 h-72 bg-primary/5 blur-[140px]" />
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
    <div className="relative bg-black">
      {/* SECTION 1: CTA WITH 3D VISUALS (Sticky Base - Reduced Height) */}
      <div className="sticky top-0 min-h-[450px] py-16 md:py-20 flex items-center overflow-hidden bg-[#000000] z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 w-full relative flex items-center justify-between">
          <div className="max-w-2xl relative z-20">
            <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-display font-bold tracking-[-0.03em] leading-[1.15] mb-8 md:mb-10 text-white text-left">
              {t('Ready to get paid faster?')} <br />
              <span className="text-primary">{t('Start your free trial today.')}</span>
            </h2>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Button
                onClick={() => navigate({ to: '/signup' })}
                className="h-14 px-10 rounded-full bg-primary text-[#0b0b0b] font-bold text-base hover:bg-primary/90 hover:scale-[1.03] transition-all duration-300 border-none shadow-xl shadow-primary/30"
              >
                {t('Start free, no credit card')}
              </Button>
              <Button
                variant="outline"
                className="h-14 px-10 rounded-full border-2 border-white/40 text-white hover:bg-white hover:text-slate-900 font-bold text-base transition-all duration-300 bg-white/5 backdrop-blur-sm"
              >
                {t('Watch 2-min demo')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Background Illustration (3 Slabs - Enhanced Visibility) */}
          <div className="absolute right-[-5%] top-0 bottom-0 w-2/3 hidden lg:flex items-center justify-end gap-8 opacity-80 pointer-events-none select-none pr-32">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-[160px] h-[450px] bg-gradient-to-b from-[#2a2a2a] to-[#0f0f0f] rounded-[32px] border border-white/20 shadow-[20px_20px_60px_rgba(0,0,0,0.8)] transform -rotate-[22deg] skew-x-[-8deg] transition-transform duration-700"
                style={{
                  marginTop: `${i * 100}px`,
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] to-transparent rounded-[32px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: THE GLASS OVERLAP FOOTER (Scrolls over Section 1) */}
      <div className="relative z-30 px-4 sm:px-6 lg:px-8 pb-16 flex justify-center bg-transparent -mt-16">
        <div className="w-full max-w-[1600px] rounded-[48px] border border-white/20 bg-white/[0.06] backdrop-blur-[160px] shadow-[0_-80px_100px_rgba(0,0,0,1)] overflow-hidden">

          
          <div className="max-w-7xl mx-auto px-10 md:px-16">
            {/* Top Integrated Header Row */}
            <div className="py-12 flex flex-col md:flex-row justify-between items-center gap-6 text-left">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="ZuriBills" className="w-8 h-8" />
                <span className="font-display text-lg font-semibold tracking-tight">
                  <span className="text-white">Zuri</span><span className="text-primary">Bills</span>
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold">
                © 2026 ZuriBills • Made with ❤️ by X-Labs
              </div>
            </div>

            <div className="w-full h-px bg-white/[0.08]" />

            <div className="py-24">
              {/* Nav Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-24 text-left">

                {/* Brand/Social Column */}
                <div>
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/25 font-black mb-6">Get Started</h4>
                      <ul className="space-y-4 text-[15px] font-semibold text-white/60">
                        <li><button onClick={() => navigate({ to: '/signup' })} className="hover:text-white transition-colors">Create an account</button></li>
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

                {/* Company */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Company')}</h4>
                  <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                    {['About Us', 'Careers', 'Coverage', 'Contact'].map(item => (
                      <li key={item}><a href="#" className="hover:text-white transition-colors">{t(item)}</a></li>
                    ))}
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/25 font-black mb-10 text-white">{t('Legal')}</h4>
                  <ul className="space-y-5 text-[15px] font-semibold text-white/70">
                    {[
                      { label: 'Terms of Use', href: '/terms' },
                      { label: 'Disclaimer', href: '/disclaimer' },
                      { label: 'Cookies', href: '/cookies' },
                      { label: 'Security', href: '/security' },
                    ].map(item => (
                      <li key={item.label}><a href={item.href} className="hover:text-white transition-colors">{t(item.label)}</a></li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
