import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { Card } from '@/components/ui';
import { askBusinessAnalyst } from '@/services/geminiService';
import { getInvoices, getClients, getServices } from '@/services/storage';
import { Organization } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

interface BusinessChatWidgetProps {
    org: Organization;
}

const BusinessChatWidget: React.FC<BusinessChatWidgetProps> = ({ org }) => {
    const translationStrings = useMemo(() => ([
        "Hi! I'm your business assistant.",
        'Ask me anything about your invoices or performance!',
        'Business Analyst',
        'Ask about revenue, clients...',
        'AI generation disbaled',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: `${t("Hi! I'm your business assistant.")} ${org.name}. ${t('Ask me anything about your invoices or performance!')}`, sender: 'ai', timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: crypto.randomUUID(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Gather context on demand
            const [invoices, clients, services] = await Promise.all([
                getInvoices(org.id),
                getClients(org.id),
                getServices(org.id)
            ]);

            const responseText = await askBusinessAnalyst(userMsg.text, {
                invoices,
                clients,
                services,
                orgName: org.name,
                currency: org.currency
            });

            const aiMsg: Message = { id: crypto.randomUUID(), text: responseText, sender: 'ai', timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = { id: crypto.randomUUID(), text: t('AI generation disbaled'), sender: 'ai', timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Chat Window */}
            {isOpen && (
                <Card className="w-80 md:w-96 h-[500px] mb-4 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up pointer-events-auto border border-border">
                    {/* Header */}
                    <div className="bg-foreground text-background p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[var(--on-primary)]">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">{org.name} AI</h3>
                                <p className="text-[10px] text-background/70">{t('Business Analyst')}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-background/70 hover:text-background">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === 'user'
                                    ? 'bg-primary text-[var(--on-primary)] rounded-tr-none'
                                    : 'bg-background border border-border text-foreground rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-background border border-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-background border-t border-border">
                        <form
                            className="flex gap-2"
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        >
                            <input
                                className="flex-1 bg-surface text-foreground placeholder:text-muted rounded-full px-4 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
                                placeholder={t('Ask about revenue, clients...')}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="w-9 h-9 flex-none bg-primary text-[var(--on-primary)] rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </Card>
            )}

            {/* Parsing FAB */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-[#A9F5D9] rounded-full shadow-lg shadow-black/10 flex items-center justify-center text-black hover:scale-105 transition-transform pointer-events-auto"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>
        </div>
    );
};

export default BusinessChatWidget;
