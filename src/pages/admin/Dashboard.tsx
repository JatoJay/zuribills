
// ... imports
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Expense, ExpenseStatus, Invoice, InvoiceStatus } from '@/types';
import { getExpenses, getInvoices } from '@/services/storage';
import { Card, Badge } from '@/components/ui';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, AlertCircle, TrendingUp, Activity, PieChart as PieChartIcon, ArrowUpRight, Bot, Wallet } from 'lucide-react';
import { runInvoiceAgent, getAgentLogs } from '@/services/aiAgent';
import { AgentLog } from '@/types';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // Paid (Green), Sent (Blue), Draft (Amber), Overdue (Red)

const Dashboard: React.FC = () => {
    const { org, formatMoney } = useAdminContext();
    const translationStrings = useMemo(() => ([
        'Analytics Dashboard',
        'Overview for',
        'Total Revenue',
        'Outstanding',
        'Payment Rate',
        'Avg. Invoice',
        'Expenses (Paid)',
        'Outstanding:',
        'View expenses →',
        'AI Invoice Agent',
        'Active & Monitoring',
        'No recent activity. I\'m watching your invoices!',
        'Revenue & Volume',
        'Last 6 months performance',
        'Invoiced',
        'Paid',
        'Sent',
        'Draft',
        'Overdue',
        'Invoice Status',
        'Distribution by count',
        'No data available',
        'Total',
        'Recent Invoices',
        'View All',
        'Invoice',
        'Client',
        'Amount',
        'Status',
        'No invoices yet.',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);

    useEffect(() => {
        if (org) {
            getInvoices(org.id).then(setInvoices);
            getExpenses(org.id).then(setExpenses);
            // Run Agent
            runInvoiceAgent(org.id).then(async (newLogs) => {
                const allLogs = await getAgentLogs(org.id);
                setAgentLogs(allLogs);
                if (newLogs.length > 0) {
                    // Refresh invoices if agent made changes
                    getInvoices(org.id).then(setInvoices);
                }
            });
        }
    }, [org]);

    // --- Metrics Calculations ---
    const totalRevenue = invoices
        .filter(i => i.status === InvoiceStatus.PAID)
        .reduce((sum, i) => sum + i.total, 0);

    const pendingAmount = invoices
        .filter(i => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE)
        .reduce((sum, i) => sum + i.total, 0);

    const totalInvoices = invoices.length;
    const paidCount = invoices.filter(i => i.status === InvoiceStatus.PAID).length;
    const paymentRate = totalInvoices > 0 ? Math.round((paidCount / totalInvoices) * 100) : 0;

    const averageValue = totalInvoices > 0
        ? invoices.reduce((sum, i) => sum + i.total, 0) / totalInvoices
        : 0;

    const totalExpenses = expenses
        .filter(e => e.status === ExpenseStatus.PAID)
        .reduce((sum, e) => sum + e.total, 0);

    const outstandingExpenses = expenses
        .filter(e => e.status === ExpenseStatus.SUBMITTED || e.status === ExpenseStatus.OVERDUE)
        .reduce((sum, e) => sum + e.total, 0);

    // --- Chart Data Processing ---

    // 1. Revenue History (Last 6 Months)
    const getLast6Months = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({
                dateObj: d,
                name: d.toLocaleString('default', { month: 'short' }),
                key: `${d.getFullYear()}-${d.getMonth()}`
            });
        }
        return months;
    };

    const chartData = getLast6Months().map(month => {
        const monthInvoices = invoices.filter(inv => {
            const d = new Date(inv.date);
            return `${d.getFullYear()}-${d.getMonth()}` === month.key;
        });

        return {
            name: month.name,
            revenue: monthInvoices.filter(i => i.status === InvoiceStatus.PAID).reduce((s, i) => s + i.total, 0),
            invoiced: monthInvoices.reduce((s, i) => s + i.total, 0),
            count: monthInvoices.length
        };
    });

    // 2. Status Distribution
    const statusCounts = invoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = [
        { name: t('Paid'), value: statusCounts[InvoiceStatus.PAID] || 0, color: COLORS[0] },
        { name: t('Sent'), value: statusCounts[InvoiceStatus.SENT] || 0, color: COLORS[1] },
        { name: t('Draft'), value: statusCounts[InvoiceStatus.DRAFT] || 0, color: COLORS[2] },
        { name: t('Overdue'), value: statusCounts[InvoiceStatus.OVERDUE] || 0, color: COLORS[3] },
    ].filter(d => d.value > 0);

    if (!org.id) return <div className="p-8">Loading...</div>;
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">{t('Analytics Dashboard')}</h2>
                <div className="text-sm text-muted">
                    {t('Overview for')} <span className="font-semibold text-foreground">{org.name}</span>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <Card className="p-6 relative overflow-hidden bg-surface border-border">
                    <div className="flex items-center justify-between z-10 relative">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm text-muted font-medium">{t('Total Revenue')}</p>
                            <h3 className="text-2xl font-bold mt-1 tracking-tight text-foreground">{formatMoney(totalRevenue)}</h3>
                        </div>
                        <div className="shrink-0 p-3 bg-green-500/10 rounded-xl text-green-500">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-500/5 rounded-full z-0 pointer-events-none" />
                </Card>

                <Card className="p-6 relative overflow-hidden bg-surface border-border">
                    <div className="flex items-center justify-between z-10 relative">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm text-muted font-medium">{t('Outstanding')}</p>
                            <h3 className="text-2xl font-bold mt-1 tracking-tight text-foreground">{formatMoney(pendingAmount)}</h3>
                        </div>
                        <div className="shrink-0 p-3 bg-orange-500/10 rounded-xl text-orange-500">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500/5 rounded-full z-0 pointer-events-none" />
                </Card>

                <Card className="p-6 relative overflow-hidden bg-surface border-border">
                    <div className="flex items-center justify-between z-10 relative">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm text-muted font-medium">{t('Payment Rate')}</p>
                            <h3 className="text-2xl font-bold mt-1 tracking-tight text-foreground">{paymentRate}%</h3>
                        </div>
                        <div className="shrink-0 p-3 bg-blue-500/10 rounded-xl text-blue-500">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="w-full bg-surface/50 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${paymentRate}%` }}></div>
                    </div>
                </Card>

                <Card className="p-6 relative overflow-hidden bg-surface border-border">
                    <div className="flex items-center justify-between z-10 relative">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm text-muted font-medium">{t('Avg. Invoice')}</p>
                            <h3 className="text-2xl font-bold mt-1 tracking-tight text-foreground">{formatMoney(averageValue)}</h3>
                        </div>
                        <div className="shrink-0 p-3 bg-purple-500/10 rounded-xl text-purple-500">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500/5 rounded-full z-0 pointer-events-none" />
                </Card>

                <Card className="p-6 relative overflow-hidden bg-surface border-border">
                    <div className="flex items-center justify-between z-10 relative">
                        <div className="min-w-0 pr-2">
                            <p className="text-sm text-muted font-medium">{t('Expenses (Paid)')}</p>
                            <h3 className="text-2xl font-bold mt-1 tracking-tight text-foreground">{formatMoney(totalExpenses)}</h3>
                            <p className="text-xs text-muted mt-2">
                                {t('Outstanding:')} <span className="text-foreground font-semibold">{formatMoney(outstandingExpenses)}</span>
                            </p>
                        </div>
                        <div className="shrink-0 p-3 bg-primary/10 rounded-xl text-primary">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full z-0 pointer-events-none" />
                    <div className="mt-4">
                        <Link
                            to="/org/$slug/expenses"
                            params={{ slug: org.slug }}
                            className="text-xs font-semibold text-primary hover:text-primary/80"
                        >
                            {t('View expenses →')}
                        </Link>
                    </div>
                </Card>
            </div>

            {/* AI Agent Activity */}
            <Card className="p-6 bg-surface border-border relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
                        <Bot className="w-6 h-6 text-background" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">{t('AI Invoice Agent')}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> {t('Active & Monitoring')}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {agentLogs.length > 0 ? (
                        agentLogs.map(log => (
                            <div key={log.id} className="flex gap-3 text-sm p-3 rounded-lg bg-surface/40 border border-border">
                                <div className={`w-1.5 rounded-full ${log.type === 'WARNING' ? 'bg-red-500' : log.type === 'SUCCESS' ? 'bg-green-500' : 'bg-blue-500'} shrink-0`} />
                                <div>
                                    <div className="font-medium text-foreground">{log.action}</div>
                                    <div className="text-muted text-xs mt-0.5">{log.details}</div>
                                    <div className="text-[10px] text-muted mt-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted py-8 text-sm">
                            <Bot className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            {t("No recent activity. I'm watching your invoices!")}
                        </div>
                    )}
                </div>
            </Card>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue Chart */}
                <Card className="p-6 lg:col-span-2 bg-surface border-border">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">{t('Revenue & Volume')}</h3>
                            <p className="text-sm text-muted">{t('Last 6 months performance')}</p>
                        </div>
                        <div className="flex gap-2 text-xs font-medium">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-muted"></div> {t('Invoiced')}</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> {t('Paid')}</div>
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `${val / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: 'var(--surface)' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                                />
                                <Bar dataKey="invoiced" name="Total Invoiced" fill="var(--text-muted)" radius={[4, 4, 0, 0]} barSize={20} opacity={0.3} />
                                <Bar dataKey="revenue" name="Revenue Collected" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Status Distribution */}
                <Card className="p-6 bg-surface border-border">
                    <h3 className="text-lg font-bold mb-1 text-foreground">{t('Invoice Status')}</h3>
                    <p className="text-sm text-muted mb-6">{t('Distribution by count')}</p>

                    <div className="h-48 w-full relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted">
                                <PieChartIcon className="w-8 h-8 mb-2 opacity-20" />
                                <span className="text-xs">{t('No data available')}</span>
                            </div>
                        )}
                        {/* Center Text */}
                        {pieData.length > 0 && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <div className="text-2xl font-bold text-foreground">{totalInvoices}</div>
                                <div className="text-[10px] text-muted uppercase font-bold tracking-wider">{t('Total')}</div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 space-y-2">
                        {pieData.map(entry => (
                            <div key={entry.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-muted">{entry.name}</span>
                                </div>
                                <span className="font-medium text-foreground">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Recent Activity / Invoices Table */}
            <Card className="overflow-hidden bg-surface border-border">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-lg text-foreground">{t('Recent Invoices')}</h3>
                    <Link to="/org/$slug/invoices" params={{ slug: org.slug }} className="text-sm text-primary hover:text-primary/80 flex items-center font-medium transition-colors">
                        {t('View All')} <ArrowUpRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-surface/50 text-muted font-medium">
                            <tr>
                                <th className="px-6 py-3">{t('Invoice')}</th>
                                <th className="px-6 py-3">{t('Client')}</th>
                                <th className="px-6 py-3">{t('Amount')}</th>
                                <th className="px-6 py-3">{t('Status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {invoices.slice(0, 5).map(inv => (
                                <tr key={inv.id} className="hover:bg-surface/30 transition-colors">
                                    <td className="px-6 py-4 font-mono font-medium text-foreground">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-muted">{inv.clientName}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{formatMoney(inv.total)}</td>
                                    <td className="px-6 py-4"><Badge status={inv.status} /></td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr><td colSpan={4} className="p-6 text-center text-muted">{t('No invoices yet.')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div >
    );
};

export default Dashboard;
