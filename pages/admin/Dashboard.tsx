
import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Organization, Invoice, InvoiceStatus } from '../../types';
import { getInvoices } from '../../services/storage';
import { Card, Badge } from '../../components/ui';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { DollarSign, FileCheck, AlertCircle, TrendingUp, Activity, PieChart as PieChartIcon, ArrowUpRight } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // Paid (Green), Sent (Blue), Draft (Amber), Overdue (Red)

const Dashboard: React.FC = () => {
  const { org, formatMoney } = useOutletContext<{ org: Organization, formatMoney: (n: number, c?: string) => string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (org) getInvoices(org.id).then(setInvoices);
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
      { name: 'Paid', value: statusCounts[InvoiceStatus.PAID] || 0, color: COLORS[0] },
      { name: 'Sent', value: statusCounts[InvoiceStatus.SENT] || 0, color: COLORS[1] },
      { name: 'Draft', value: statusCounts[InvoiceStatus.DRAFT] || 0, color: COLORS[2] },
      { name: 'Overdue', value: statusCounts[InvoiceStatus.OVERDUE] || 0, color: COLORS[3] },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="text-sm text-slate-500">
            Overview for <span className="font-semibold text-slate-900">{org.name}</span>
        </div>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 relative overflow-hidden">
            <div className="flex items-center justify-between z-10 relative">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                    <h3 className="text-2xl font-bold mt-1 tracking-tight">{formatMoney(totalRevenue)}</h3>
                </div>
                <div className="p-3 bg-green-100 rounded-xl text-green-600">
                    <DollarSign className="w-5 h-5" />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-50 rounded-full z-0 opacity-50" />
        </Card>

        <Card className="p-6 relative overflow-hidden">
            <div className="flex items-center justify-between z-10 relative">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Outstanding</p>
                    <h3 className="text-2xl font-bold mt-1 tracking-tight">{formatMoney(pendingAmount)}</h3>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                    <AlertCircle className="w-5 h-5" />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-50 rounded-full z-0 opacity-50" />
        </Card>

        <Card className="p-6 relative overflow-hidden">
            <div className="flex items-center justify-between z-10 relative">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Payment Rate</p>
                    <h3 className="text-2xl font-bold mt-1 tracking-tight">{paymentRate}%</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                    <Activity className="w-5 h-5" />
                </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${paymentRate}%` }}></div>
            </div>
        </Card>

        <Card className="p-6 relative overflow-hidden">
            <div className="flex items-center justify-between z-10 relative">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Avg. Invoice</p>
                    <h3 className="text-2xl font-bold mt-1 tracking-tight">{formatMoney(averageValue)}</h3>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-50 rounded-full z-0 opacity-50" />
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart */}
        <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold">Revenue & Volume</h3>
                    <p className="text-sm text-slate-500">Last 6 months performance</p>
                </div>
                <div className="flex gap-2 text-xs font-medium">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-800"></div> Invoiced</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Paid</div>
                </div>
            </div>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="invoiced" name="Total Invoiced" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="revenue" name="Revenue Collected" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
            <h3 className="text-lg font-bold mb-1">Invoice Status</h3>
            <p className="text-sm text-slate-500 mb-6">Distribution by count</p>
            
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
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <PieChartIcon className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs">No data available</span>
                    </div>
                )}
                {/* Center Text */}
                {pieData.length > 0 && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="text-2xl font-bold text-slate-900">{totalInvoices}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total</div>
                     </div>
                )}
            </div>
            
            <div className="mt-6 space-y-2">
                {pieData.map(entry => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-slate-600">{entry.name}</span>
                        </div>
                        <span className="font-medium text-slate-900">{entry.value}</span>
                    </div>
                ))}
            </div>
        </Card>
      </div>

      {/* Recent Activity / Invoices Table */}
      <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Recent Invoices</h3>
              <Link to="invoices" className="text-sm text-blue-600 hover:text-blue-700 flex items-center font-medium">
                  View All <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                          <th className="px-6 py-3">Invoice</th>
                          <th className="px-6 py-3">Client</th>
                          <th className="px-6 py-3">Amount</th>
                          <th className="px-6 py-3">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {invoices.slice(0, 5).map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-mono font-medium text-slate-700">{inv.invoiceNumber}</td>
                              <td className="px-6 py-4">{inv.clientName}</td>
                              <td className="px-6 py-4 font-medium">{formatMoney(inv.total)}</td>
                              <td className="px-6 py-4"><Badge status={inv.status} /></td>
                          </tr>
                      ))}
                      {invoices.length === 0 && (
                          <tr><td colSpan={4} className="p-6 text-center text-slate-500">No invoices yet.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </Card>
    </div>
  );
};

export default Dashboard;
