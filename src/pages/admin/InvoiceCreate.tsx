
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Service, InvoiceItem, InvoiceStatus, Invoice } from '@/types';
import { getServices, createInvoice } from '@/services/storage';
import { Button, Input, Card, formatCurrency } from '@/components/ui';
import { Trash2, Plus, ArrowLeft, Sparkles, Shield } from 'lucide-react';
import { parseInvoicePrompt, validateInvoiceCompliance, ComplianceResult } from '@/services/geminiService';
import ComplianceModal from '@/components/ComplianceModal';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

const InvoiceCreate: React.FC = () => {
    const { org } = useAdminContext();
    const navigate = useNavigate();
    const location = useLocation();
    const translationStrings = useMemo(() => ([
        'Back to Invoices',
        'New Invoice',
        'Audit',
        'Save & Send',
        'Magic Auto-Fill',
        'Describe the invoice and let Gemini AI fill the details for you.',
        'Generate',
        'Client Details',
        'Client Name',
        'Client Email',
        'Company Name',
        'Invoice Settings',
        'Due Date',
        'Notes / Terms',
        'Additional notes...',
        'Line Items',
        'Item / Service',
        'Custom Item',
        'Description',
        'Qty',
        'Price',
        'Add Line Item',
        'Subtotal',
        'VAT',
        'VAT (%)',
        'Total',
        'Please fill client info and add items',
        'AI Error:',
        'e.g. Bill Acme Corp $500 for Web Design and $150 for Hosting',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [formData, setFormData] = useState({
        clientName: '',
        clientEmail: '',
        clientCompany: '',
        dueDate: '',
        notes: '',
        vatRate: 0,
    });

    const [items, setItems] = useState<InvoiceItem[]>([]);

    // Compliance State
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

    useEffect(() => {
        let isActive = true;
        if (!org?.id) {
            setServices([]);
            return () => {
                isActive = false;
            };
        }
        setServices([]);
        getServices(org.id).then((data) => {
            if (isActive) {
                setServices(data.filter(service => service.organizationId === org.id));
            }
        });
        return () => {
            isActive = false;
        };
    }, [org?.id]);

    useEffect(() => {
        const state = location.state as any;
        if (state?.duplicateInvoice) {
            const source: Invoice = state.duplicateInvoice;
            setFormData({
                clientName: source.clientName,
                clientEmail: source.clientEmail,
                clientCompany: source.clientCompany || '',
                dueDate: '',
                notes: source.notes || '',
                vatRate: Number.isFinite(source.taxRate) ? source.taxRate : 0,
            });

            setItems(source.items.map(item => ({
                ...item,
                id: crypto.randomUUID()
            })));
        }
    }, [location.state]);

    const handleAiParse = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiLoading(true);

        const result = await parseInvoicePrompt(aiPrompt, services);

        if (result.success && result.data) {
            const data = result.data;
            setFormData(prev => ({
                ...prev,
                clientName: data.clientName || prev.clientName,
                clientEmail: data.clientEmail || prev.clientEmail,
                clientCompany: data.clientCompany || prev.clientCompany,
            }));

            const newItems: InvoiceItem[] = data.items.map(i => ({
                id: crypto.randomUUID(),
                serviceId: i.serviceId,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.price,
                total: i.quantity * i.price
            }));

            if (newItems.length > 0) {
                setItems(newItems);
            }
        } else {
            console.error('AI Parse Failed:', result.error);
            alert(`${t('AI Error:')} ${result.error} `);
        }

        setIsAiLoading(false);
    };

    const handleAudit = async () => {
        setIsAuditing(true);
        setIsAuditOpen(true);
        setComplianceResult(null);

        const result = await validateInvoiceCompliance({
            client: { name: formData.clientName, email: formData.clientEmail, company: formData.clientCompany },
            items: items,
            metadata: { date: new Date().toISOString(), dueDate: formData.dueDate, notes: formData.notes }
        });

        setComplianceResult(result);
        setIsAuditing(false);
    };

    const addItem = () => {
        setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'serviceId') {
                    const s = services.find(s => s.id === value);
                    if (s) {
                        updated.description = s.name;
                        updated.unitPrice = s.price;
                    }
                }
                updated.total = updated.quantity * updated.unitPrice;
                return updated;
            }
            return item;
        }));
    };

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const vatRate = Number.isFinite(formData.vatRate) ? Math.max(0, formData.vatRate) : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    const vatLabel = `${t('VAT')} (${vatRate}%)`;

    const handleSubmit = async () => {
        if (!formData.clientName || items.length === 0) return alert(t('Please fill client info and add items'));
        setLoading(true);
        await createInvoice({
            organizationId: org.id,
            clientName: formData.clientName,
            clientEmail: formData.clientEmail,
            clientCompany: formData.clientCompany,
            items,
            subtotal,
            taxRate: vatRate,
            taxAmount: vatAmount,
            total,
            status: InvoiceStatus.SENT,
            date: new Date().toISOString(),
            dueDate: formData.dueDate || new Date().toISOString(),
            notes: formData.notes,
        });
        setLoading(false);
        navigate({ to: '/org/$slug/invoices', params: { slug: org.slug } });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => navigate({ to: '..' })} className="flex items-center text-sm text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 mr-1" /> {t('Back to Invoices')}
            </button>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('New Invoice')}</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleAudit} className="flex items-center gap-2 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                        <Shield className="w-4 h-4" /> {t('Audit')}
                    </Button>
                    <Button onClick={handleSubmit} isLoading={loading}>{t('Save & Send')}</Button>
                </div>
            </div>

            {/* AI Magic Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>{t('Magic Auto-Fill')}</span>
                </div>
                <p className="text-sm text-blue-600 mb-3">
                    {t('Describe the invoice and let Gemini AI fill the details for you.')}
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                        placeholder={t('e.g. Bill Acme Corp $500 for Web Design and $150 for Hosting')}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiParse()}
                    />
                    <Button
                        onClick={handleAiParse}
                        isLoading={isAiLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                    >
                        {t('Generate')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="font-bold mb-4">{t('Client Details')}</h3>
                    <div className="space-y-4">
                        <Input label={t('Client Name')} value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                        <Input label={t('Client Email')} type="email" value={formData.clientEmail} onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
                        <Input label={t('Company Name')} value={formData.clientCompany} onChange={e => setFormData({ ...formData, clientCompany: e.target.value })} />
                    </div>
                </Card>
                <Card className="p-6">
                    <h3 className="font-bold mb-4">{t('Invoice Settings')}</h3>
                    <div className="space-y-4">
                        <Input label={t('Due Date')} type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                        <Input
                            label={t('VAT (%)')}
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.vatRate}
                            onChange={e => {
                                const nextRate = Number(e.target.value);
                                setFormData({
                                    ...formData,
                                    vatRate: Number.isFinite(nextRate) ? Math.max(0, nextRate) : 0,
                                });
                            }}
                        />
                        <div>
                            <label className="text-sm font-medium leading-none mb-2 block">{t('Notes / Terms')}</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                                placeholder={t('Additional notes...')}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <h3 className="font-bold mb-4">{t('Line Items')}</h3>
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-2 items-end border-b pb-4">
                            <div className="flex-1">
                                <label className="text-xs font-medium mb-1 block">{t('Item / Service')}</label>
                                <select
                                    className="w-full h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                                    value={item.serviceId || ''}
                                    onChange={e => updateItem(item.id, 'serviceId', e.target.value)}
                                >
                                    <option value="">{t('Custom Item')}</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price, org.currency)})</option>)}
                                </select>
                                <Input
                                    placeholder={t('Description')}
                                    value={item.description}
                                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                                />
                            </div>
                            <div className="w-20">
                                <Input
                                    label={t('Qty')}
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                />
                            </div>
                            <div className="w-32">
                                <Input
                                    label={t('Price')}
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                />
                            </div>
                            <div className="w-32 pb-2 text-right font-mono font-medium">
                                {formatCurrency(item.total, org.currency)}
                            </div>
                            <button onClick={() => removeItem(item.id)} className="pb-3 text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <Button variant="outline" onClick={addItem} className="mt-4 border-dashed w-full">
                    <Plus className="w-4 h-4 mr-2" /> {t('Add Line Item')}
                </Button>

                <div className="flex justify-end mt-8">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>{t('Subtotal')}</span>
                            <span>{formatCurrency(subtotal, org.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>{vatLabel}</span>
                            <span>{formatCurrency(vatAmount, org.currency)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>{t('Total')}</span>
                            <span>{formatCurrency(total, org.currency)}</span>
                        </div>
                    </div>
                </div>
            </Card>

            <ComplianceModal
                isOpen={isAuditOpen}
                onClose={() => setIsAuditOpen(false)}
                result={complianceResult}
                isLoading={isAuditing}
            />
        </div>
    );
};

export default InvoiceCreate;
