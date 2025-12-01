
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice, Organization } from '../../types';
import { getOrganizationBySlug, getInvoices } from '../../services/storage';
import { Button, formatCurrency, Badge } from '../../components/ui';
import { Printer } from 'lucide-react';

const InvoiceView: React.FC = () => {
  const { slug, invoiceId } = useParams<{ slug: string, invoiceId: string }>();
  const [data, setData] = useState<{ invoice: Invoice, org: Organization } | null>(null);

  useEffect(() => {
    const load = async () => {
        if (!slug || !invoiceId) return;
        const org = await getOrganizationBySlug(slug);
        if (org) {
            const invoices = await getInvoices(org.id);
            const invoice = invoices.find(i => i.id === invoiceId);
            if (invoice) setData({ invoice, org });
        }
    };
    load();
  }, [slug, invoiceId]);

  if (!data) return <div className="p-8 text-center">Loading Invoice...</div>;

  const { invoice, org } = data;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
        <div className="max-w-3xl mx-auto print:max-w-none">
            <div className="mb-6 flex justify-end print:hidden">
                <Button onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Print Invoice
                </Button>
            </div>

            <div className="bg-white p-12 shadow-sm rounded-lg print:shadow-none">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
                    <div>
                        {org.logoUrl && <img src={org.logoUrl} alt="Logo" className="h-12 w-auto mb-4 object-contain" />}
                        <h1 className="text-2xl font-bold mb-1">{org.name}</h1>
                        <div className="text-slate-500 text-sm space-y-0.5">
                            <p>{org.contactEmail}</p>
                            {org.contactPhone && <p>{org.contactPhone}</p>}
                            {org.address && (
                                <div className="mt-1">
                                    {org.address.street && <p>{org.address.street}</p>}
                                    {(org.address.city || org.address.state || org.address.zip) && (
                                        <p>
                                            {[org.address.city, org.address.state, org.address.zip]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
                                    )}
                                    {org.address.country && <p>{org.address.country}</p>}
                                </div>
                            )}
                            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Bill From</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-light text-slate-300 mb-2">INVOICE</h2>
                        <p className="font-mono font-bold text-lg">{invoice.invoiceNumber}</p>
                        <div className="mt-2">
                             <Badge status={invoice.status} />
                        </div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Bill To</p>
                        <h3 className="font-bold">{invoice.clientName}</h3>
                        {invoice.clientCompany && <p className="text-slate-600">{invoice.clientCompany}</p>}
                        <p className="text-slate-500 text-sm">{invoice.clientEmail}</p>
                    </div>
                    <div className="text-right">
                        <div className="space-y-1">
                             <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">Date:</span>
                                <span className="font-medium">{new Date(invoice.date).toLocaleDateString()}</span>
                             </div>
                             <div className="flex justify-between">
                                <span className="text-slate-500 text-sm">Due Date:</span>
                                <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b border-black text-sm">
                            <th className="text-left py-2 font-bold">Description</th>
                            <th className="text-right py-2 font-bold w-20">Qty</th>
                            <th className="text-right py-2 font-bold w-32">Price</th>
                            <th className="text-right py-2 font-bold w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {invoice.items.map(item => (
                            <tr key={item.id} className="border-b border-slate-100">
                                <td className="py-4 text-slate-700">{item.description}</td>
                                <td className="py-4 text-right text-slate-500">{item.quantity}</td>
                                <td className="py-4 text-right text-slate-500">{formatCurrency(item.unitPrice, org.currency)}</td>
                                <td className="py-4 text-right font-medium">{formatCurrency(item.total, org.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal, org.currency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                            <span>Tax (0%)</span>
                            <span>{formatCurrency(0, org.currency)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl pt-4 border-t border-slate-200">
                            <span>Total</span>
                            <span>{formatCurrency(invoice.total, org.currency)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                {invoice.notes && (
                    <div className="mt-12 pt-6 border-t border-slate-100">
                        <h4 className="font-bold text-sm mb-2 text-slate-700">Notes & Terms</h4>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-20 text-center text-xs text-slate-400">
                    <p>Thank you for your business.</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InvoiceView;
