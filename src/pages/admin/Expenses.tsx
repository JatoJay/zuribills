import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Select } from '@/components/ui';
import { createExpense, deleteExpense, getExpenses, updateExpenseStatus } from '@/services/storage';
import { Expense, ExpenseItem, ExpenseStatus } from '@/types';
import { useAdminContext } from './AdminLayout';
import { Plus, Trash2, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { usePrompt } from '@/context/PromptContext';

const statusStyles: Record<ExpenseStatus, string> = {
    [ExpenseStatus.DRAFT]: 'bg-slate-100 text-slate-600 border-slate-200',
    [ExpenseStatus.SUBMITTED]: 'bg-primary/10 text-primary border-primary/30',
    [ExpenseStatus.PAID]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [ExpenseStatus.OVERDUE]: 'bg-red-50 text-red-700 border-red-200',
};

const getDefaultDate = () => new Date().toISOString().slice(0, 10);

const createEmptyItem = (): ExpenseItem => ({
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitCost: 0,
    total: 0,
});

const Expenses: React.FC = () => {
    const { org, formatMoney } = useAdminContext();
    const prompt = usePrompt();
    const translationStrings = useMemo(() => ([
        'Expenses',
        'Track business expenses and generate expense invoices.',
        'New Expense Invoice',
        'Vendor',
        'Category',
        'Expense #',
        'Date',
        'Total',
        'Status',
        'Actions',
        'No expenses recorded yet.',
        'No expenses match the selected filters.',
        'All vendors',
        'All categories',
        'Uncategorized',
        'General',
        'Vendor name is required.',
        'Add at least one line item with a description.',
        'Failed to create expense.',
        'Mark Paid',
        'Delete',
        'Vendor Name',
        'Vendor Email',
        'Vendor Company',
        'Utilities, Rent, Marketing',
        'Due Date',
        'Line Items',
        'Description',
        'Qty',
        'Unit Cost',
        'Add Line Item',
        'Notes',
        'Subtotal',
        'Cancel',
        'Save Expense',
        'Mark as paid?',
        'Delete expense?',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [vendorFilter, setVendorFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const [formData, setFormData] = useState({
        vendorName: '',
        vendorEmail: '',
        vendorCompany: '',
        category: '',
        date: getDefaultDate(),
        dueDate: getDefaultDate(),
        notes: '',
        status: ExpenseStatus.SUBMITTED,
    });

    const [items, setItems] = useState<ExpenseItem[]>([createEmptyItem()]);

    const loadExpenses = () => {
        if (org) getExpenses(org.id).then(setExpenses);
    };

    useEffect(() => {
        loadExpenses();
    }, [org]);

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
    const vendorOptions = useMemo(() => {
        const vendors = Array.from(new Set(expenses.map(expense => expense.vendorName.trim()).filter(Boolean)));
        return [{ label: t('All vendors'), value: '' }, ...vendors.map(vendor => ({ label: vendor, value: vendor }))];
    }, [expenses, t]);

    const categoryOptions = useMemo(() => {
        const categories = Array.from(new Set(expenses.map(expense => (expense.category?.trim() || 'Uncategorized'))));
        return [
            { label: t('All categories'), value: '' },
            ...categories.map(category => ({
                label: category === 'Uncategorized' ? t('Uncategorized') : category,
                value: category,
            }))
        ];
    }, [expenses, t]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const vendorName = expense.vendorName.trim();
            const categoryLabel = expense.category?.trim() || 'Uncategorized';
            const vendorMatch = !vendorFilter || vendorName.toLowerCase() === vendorFilter.toLowerCase();
            const categoryMatch = !categoryFilter || categoryLabel.toLowerCase() === categoryFilter.toLowerCase();
            return vendorMatch && categoryMatch;
        });
    }, [expenses, vendorFilter, categoryFilter]);

    const resetForm = () => {
        setFormData({
            vendorName: '',
            vendorEmail: '',
            vendorCompany: '',
            category: '',
            date: getDefaultDate(),
            dueDate: getDefaultDate(),
            notes: '',
            status: ExpenseStatus.SUBMITTED,
        });
        setItems([createEmptyItem()]);
    };

    const updateItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value } as ExpenseItem;
            if (field === 'quantity' || field === 'unitCost' || field === 'description') {
                updated.total = Number(updated.quantity) * Number(updated.unitCost);
            }
            return updated;
        }));
    };

    const addItem = () => setItems(prev => [...prev, createEmptyItem()]);

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendorName.trim()) {
            prompt.alert(t('Vendor name is required.'));
            return;
        }
        if (items.length === 0 || items.some(item => !item.description.trim())) {
            prompt.alert(t('Add at least one line item with a description.'));
            return;
        }

        setLoading(true);
        try {
            await createExpense({
                organizationId: org.id,
                vendorName: formData.vendorName,
                vendorEmail: formData.vendorEmail || undefined,
                vendorCompany: formData.vendorCompany || undefined,
                category: formData.category || undefined,
                items,
                subtotal,
                taxRate: 0,
                taxAmount: 0,
                total: subtotal,
                status: formData.status,
                date: new Date(formData.date).toISOString(),
                dueDate: new Date(formData.dueDate).toISOString(),
                notes: formData.notes || undefined,
            });
            resetForm();
            setIsModalOpen(false);
            loadExpenses();
        } catch (error) {
            console.error(error);
            prompt.alert({ message: t('Failed to create expense.'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPaid = async (expense: Expense) => {
        const confirmed = await prompt.confirm(`${t('Mark as paid?')} (${expense.expenseNumber})`);
        if (!confirmed) return;
        await updateExpenseStatus(expense.id, ExpenseStatus.PAID);
        loadExpenses();
    };

    const handleDelete = async (expense: Expense) => {
        const confirmed = await prompt.confirm({
            message: `${t('Delete expense?')} (${expense.expenseNumber})`,
            type: 'warning',
            confirmText: t('Delete')
        });
        if (!confirmed) return;
        await deleteExpense(expense.id);
        loadExpenses();
    };

    if (!org.id) return <div className="p-8">Loading...</div>;
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">{t('Expenses')}</h2>
                    <p className="text-sm text-muted">{t('Track business expenses and generate expense invoices.')}</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> {t('New Expense Invoice')}
                </Button>
            </div>

            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t('Vendor')}
                        options={vendorOptions}
                        value={vendorFilter}
                        onChange={(e) => setVendorFilter(e.target.value)}
                    />
                    <Select
                        label={t('Category')}
                        options={categoryOptions}
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-surface/60 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-medium text-muted">{t('Expense #')}</th>
                                <th className="px-6 py-4 font-medium text-muted">{t('Vendor')}</th>
                                <th className="px-6 py-4 font-medium text-muted">{t('Category')}</th>
                                <th className="px-6 py-4 font-medium text-muted">{t('Date')}</th>
                                <th className="px-6 py-4 font-medium text-muted">{t('Total')}</th>
                                <th className="px-6 py-4 font-medium text-muted">{t('Status')}</th>
                                <th className="px-6 py-4 font-medium text-muted text-right">{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-muted">{t('No expenses recorded yet.')}</td>
                                </tr>
                            )}
                            {expenses.length > 0 && filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-muted">{t('No expenses match the selected filters.')}</td>
                                </tr>
                            )}
                            {filteredExpenses.map(expense => (
                                <tr key={expense.id} className="hover:bg-surface/40">
                                    <td className="px-6 py-4 font-mono text-xs text-foreground">{expense.expenseNumber}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-foreground">{expense.vendorName}</div>
                                        {expense.vendorEmail && (
                                            <div className="text-xs text-muted">{expense.vendorEmail}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-muted">{expense.category || t('General')}</td>
                                    <td className="px-6 py-4 text-muted">{new Date(expense.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{formatMoney(expense.total)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyles[expense.status]}`}>
                                            {expense.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {expense.status !== ExpenseStatus.PAID && (
                                                <Button
                                                    variant="outline"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => handleMarkPaid(expense)}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1" /> {t('Mark Paid')}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleDelete(expense)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-2xl p-6 relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-muted hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-semibold text-foreground mb-4">{t('New Expense Invoice')}</h3>

                        <form onSubmit={handleCreateExpense} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label={t('Vendor Name')}
                                    required
                                    value={formData.vendorName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
                                />
                                <Input
                                    label={t('Vendor Email')}
                                    type="email"
                                    value={formData.vendorEmail}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vendorEmail: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label={t('Vendor Company')}
                                    value={formData.vendorCompany}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vendorCompany: e.target.value }))}
                                />
                                <Input
                                    label={t('Category')}
                                    placeholder={t('Utilities, Rent, Marketing')}
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label={t('Date')}
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                />
                                <Input
                                    label={t('Due Date')}
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                />
                                <Select
                                    label={t('Status')}
                                    options={Object.values(ExpenseStatus).map(status => ({ label: status, value: status }))}
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ExpenseStatus }))}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">{t('Line Items')}</label>
                                <div className="space-y-3">
                                    {items.map(item => (
                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_120px_auto] gap-3 items-end">
                                            <Input
                                                label={t('Description')}
                                                value={item.description}
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            />
                                            <Input
                                                label={t('Qty')}
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                            />
                                            <Input
                                                label={t('Unit Cost')}
                                                type="number"
                                                min="0"
                                                value={item.unitCost}
                                                onChange={(e) => updateItem(item.id, 'unitCost', Number(e.target.value))}
                                            />
                                            <div className="pb-2 text-sm font-semibold text-foreground">
                                                {formatMoney(item.total, org.currency)}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 w-10 p-0 text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => removeItem(item.id)}
                                                disabled={items.length === 1}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" onClick={addItem} className="mt-4">
                                    <Plus className="w-4 h-4 mr-2" /> {t('Add Line Item')}
                                </Button>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">{t('Notes')}</label>
                                <textarea
                                    className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <div className="text-sm text-muted">{t('Subtotal')}</div>
                                <div className="text-lg font-semibold text-foreground">{formatMoney(subtotal, org.currency)}</div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" isLoading={loading}>
                                    {t('Save Expense')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Expenses;
