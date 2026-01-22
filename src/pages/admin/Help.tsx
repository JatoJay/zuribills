
import React, { useMemo, useState } from 'react';
import { Card, Input } from '@/components/ui';
import { HelpCircle, MessageCircle, Mail, FileText, ExternalLink, ChevronDown, ChevronUp, Search, BookOpen, Video, Zap, Shield, CreditCard } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const Help: React.FC = () => {
    const { org } = useAdminContext();
    const translationStrings = useMemo(() => ([
        'Help & Support',
        'How can we help you today?',
        'Search for answers...',
        'Getting Started',
        'Quick guides to get you up and running',
        'Billing & Payments',
        'Payment processing and subscription info',
        'Account & Security',
        'Manage your account and security settings',
        'Frequently Asked Questions',
        'Contact Support',
        'Need more help? Our support team is here for you.',
        'Email Support',
        'Get a response within 24 hours',
        'Live Chat',
        'Chat with our support team',
        'Documentation',
        'Browse our comprehensive guides',
        'Video Tutorials',
        'Learn with step-by-step videos',
        'How do I create my first invoice?',
        'Go to Invoices > Create Invoice, fill in client details and line items, then click Save & Send to email it directly to your client.',
        'How do I set up payment processing?',
        'Navigate to Payouts, connect your bank account or mobile money, and enable payments in your organization settings.',
        'Can I customize my invoice template?',
        'Yes! Go to Settings to upload your logo, set brand colors, and add your business details that appear on all invoices.',
        'How do I add team members?',
        'Go to Team, click Invite Member, enter their email and assign a role. They will receive an invitation to join your organization.',
        'What payment methods are supported?',
        'We support card payments, bank transfers, and mobile money (M-Pesa, MTN, Airtel) depending on your region.',
        'How do I export my reports?',
        'Go to Reports, select your date range and report type, then click the Export button to download as PDF or CSV.',
        'How do I transfer invoice ownership?',
        'Open the invoice, click the Transfer Ownership button, enter the new owner details, and confirm the transfer.',
        'What currencies are supported?',
        'We support 30+ currencies including USD, EUR, GBP, NGN, KES, RWF, GHS, and many more.',
        'Invoices',
        'Payments',
        'Team',
        'Reports',
        'Start Chat',
        'Send Email',
        'View Docs',
        'Watch Videos',
    ]), []);
    const { t } = useTranslation(translationStrings);

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    const faqs: FAQItem[] = [
        {
            question: t('How do I create my first invoice?'),
            answer: t('Go to Invoices > Create Invoice, fill in client details and line items, then click Save & Send to email it directly to your client.'),
            category: t('Invoices'),
        },
        {
            question: t('How do I set up payment processing?'),
            answer: t('Navigate to Payouts, connect your bank account or mobile money, and enable payments in your organization settings.'),
            category: t('Payments'),
        },
        {
            question: t('Can I customize my invoice template?'),
            answer: t('Yes! Go to Settings to upload your logo, set brand colors, and add your business details that appear on all invoices.'),
            category: t('Invoices'),
        },
        {
            question: t('How do I add team members?'),
            answer: t('Go to Team, click Invite Member, enter their email and assign a role. They will receive an invitation to join your organization.'),
            category: t('Team'),
        },
        {
            question: t('What payment methods are supported?'),
            answer: t('We support card payments, bank transfers, and mobile money (M-Pesa, MTN, Airtel) depending on your region.'),
            category: t('Payments'),
        },
        {
            question: t('How do I export my reports?'),
            answer: t('Go to Reports, select your date range and report type, then click the Export button to download as PDF or CSV.'),
            category: t('Reports'),
        },
        {
            question: t('How do I transfer invoice ownership?'),
            answer: t('Open the invoice, click the Transfer Ownership button, enter the new owner details, and confirm the transfer.'),
            category: t('Invoices'),
        },
        {
            question: t('What currencies are supported?'),
            answer: t('We support 30+ currencies including USD, EUR, GBP, NGN, KES, RWF, GHS, and many more.'),
            category: t('Payments'),
        },
    ];

    const filteredFAQs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const quickLinks = [
        { icon: Zap, title: t('Getting Started'), description: t('Quick guides to get you up and running'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { icon: CreditCard, title: t('Billing & Payments'), description: t('Payment processing and subscription info'), color: 'text-green-500', bg: 'bg-green-500/10' },
        { icon: Shield, title: t('Account & Security'), description: t('Manage your account and security settings'), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ];

    const supportChannels = [
        { icon: Mail, title: t('Email Support'), description: t('Get a response within 24 hours'), action: t('Send Email'), href: 'mailto:support@invoiceflow.app' },
        { icon: BookOpen, title: t('Documentation'), description: t('Browse our comprehensive guides'), action: t('View Docs'), href: 'https://docs.invoiceflow.app' },
        { icon: Video, title: t('Video Tutorials'), description: t('Learn with step-by-step videos'), action: t('Watch Videos'), href: 'https://youtube.com/@invoiceflow' },
    ];

    if (!org?.id) return <div className="p-8">Loading...</div>;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <HelpCircle className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">{t('Help & Support')}</h1>
                <p className="text-muted">{t('How can we help you today?')}</p>
            </div>

            <div className="relative max-w-2xl mx-auto w-full flex justify-center">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <Input
                    placeholder={t('Search for answers...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 text-base border border-border rounded-lg w-full"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickLinks.map((link, index) => (
                    <Card key={index} className="p-5 hover:border-primary/30 transition-colors cursor-pointer group">
                        <div className={`w-10 h-10 ${link.bg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <link.icon className={`w-5 h-5 ${link.color}`} />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{link.title}</h3>
                        <p className="text-sm text-muted">{link.description}</p>
                    </Card>
                ))}
            </div>

            <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {t('Frequently Asked Questions')}
                </h2>
                <div className="space-y-3">
                    {filteredFAQs.map((faq, index) => (
                        <div
                            key={index}
                            className="border border-border rounded-lg overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                                        {faq.category}
                                    </span>
                                    <span className="font-medium text-foreground">{faq.question}</span>
                                </div>
                                {expandedFAQ === index ? (
                                    <ChevronUp className="w-5 h-5 text-muted flex-shrink-0" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-muted flex-shrink-0" />
                                )}
                            </button>
                            {expandedFAQ === index && (
                                <div className="px-4 pb-4 pt-0">
                                    <p className="text-muted pl-[72px]">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredFAQs.length === 0 && (
                        <p className="text-center text-muted py-8">No results found for "{searchQuery}"</p>
                    )}
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    {t('Contact Support')}
                </h2>
                <p className="text-muted mb-6">{t('Need more help? Our support team is here for you.')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {supportChannels.map((channel, index) => (
                        <a
                            key={index}
                            href={channel.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center text-center p-5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                        >
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <channel.icon className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground mb-1">{channel.title}</h3>
                            <p className="text-xs text-muted mb-3">{channel.description}</p>
                            <span className="text-sm font-medium text-primary flex items-center gap-1">
                                {channel.action} <ExternalLink className="w-3 h-3" />
                            </span>
                        </a>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default Help;
