import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Organization, Invoice, InvoiceStatus } from '../../types';
import { getInvoices } from '../../services/storage';
import { Card } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, FileCheck, AlertCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { org, formatMoney } = useOutletContext<{ org: Organization, formatMoney: (n: number, c?: string) => string }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (org) getInvoices(org.id).then(setInvoices);
  }, [org]);

  const totalRevenue = invoices
    .filter(i => i.status === InvoiceStatus.PAID)
    .reduce((sum, i) => sum + i.total, 0);

  const pendingAmount = invoices
    .filter(i => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE)
    .reduce((sum, i) => sum + i.total, 0);

  // Chart Data Preparation
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('default', { month: 'short' });
  }).reverse();

  const chartData = last6Months.map(month => ({
    name: month,
    amount: Math.floor(Math.random() * 5000) // Mock data since we don't have historical dates in simulation easily
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">{formatMoney(totalRevenue)}</h3>
                </div>
                <div className="p-3 bg-green-100 rounded-full text-green-600">
                    <DollarSign className="w-6 h-6" />
                </div>
            </div>
        </Card>
        <Card className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Pending Payments</p>
                    <h3 className="text-2xl font-bold mt-1">{formatMoney(pendingAmount)}</h3>
                </div>
                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                    <AlertCircle className="w-6 h-6" />
                </div>
            </div>
        </Card>
        <Card className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Invoices</p>
                    <h3 className="text-2xl font-bold mt-1">{invoices.length}</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <FileCheck className="w-6 h-6" />
                </div>
            </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-6">Revenue Overview (Simulated)</h3>
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} />
                    <Bar dataKey="amount" fill={org.primaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;