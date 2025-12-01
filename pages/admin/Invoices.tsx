import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Organization, Invoice, InvoiceStatus } from '../../types';
import { getInvoices, updateInvoiceStatus } from '../../services/storage';
import { Button, Card, Badge } from '../../components/ui';
import { Plus, Eye, Copy, Send, Sparkles, X } from 'lucide-react';
import { sendInvoiceEmail } from '../../services/email';
import { generateInvoiceEmailBody } from '../../services/geminiService';

const Invoices: React.FC = () => {
  const { org, formatMoney } = useOutletContext<{ org: Organization, formatMoney: (n: number, c?: string) => string }>();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Send Modal State
  const [sendingInvoice, setSendingInvoice] = useState<Invoice | null>(null);
  const [emailBody, setEmailBody] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadInvoices = () => {
    if (org) getInvoices(org.id).then(setInvoices);
  };

  useEffect(() => {
    loadInvoices();
  }, [org]);

  const handleStatusChange = async (id: string, status: InvoiceStatus) => {
      await updateInvoiceStatus(id, status);
      loadInvoices();
  };

  const openSendModal = async (invoice: Invoice) => {
      setSendingInvoice(invoice);
      setIsGeneratingEmail(true);
      
      const formattedTotal = formatMoney(invoice.total);
      const dueDate = new Date(invoice.dueDate).toLocaleDateString();
      
      // Call Gemini to generate email
      const generatedText = await generateInvoiceEmailBody(
          invoice.clientName,
          invoice.invoiceNumber,
          formattedTotal,
          dueDate
      );
      
      setEmailBody(generatedText);
      setIsGeneratingEmail(false);
  };

  const confirmSend = async () => {
      if (!sendingInvoice) return;
      setIsSending(true);
      await sendInvoiceEmail(sendingInvoice);
      await updateInvoiceStatus(sendingInvoice.id, InvoiceStatus.SENT);
      setIsSending(false);
      setSendingInvoice(null);
      loadInvoices();
  };

  const getDueAlert = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.PAID) return null;
    if (!invoice.dueDate) return null;

    const due = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return (
            <span className="inline-flex items-center mt-2 px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                Overdue {Math.abs(diffDays)} days
            </span>
        );
    }
    
    if (diffDays >= 0 && diffDays <= 3) {
        return (
            <span className="inline-flex items-center mt-2 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                Due {diffDays === 0 ? 'Today' : `in ${diffDays} days`}
            </span>
        );
    }
    return null;
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <Button onClick={() => navigate('create')}>
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-medium text-slate-500">Invoice #</th>
                        <th className="px-6 py-4 font-medium text-slate-500">Client</th>
                        <th className="px-6 py-4 font-medium text-slate-500">Date</th>
                        <th className="px-6 py-4 font-medium text-slate-500">Total</th>
                        <th className="px-6 py-4 font-medium text-slate-500">Status</th>
                        <th className="px-6 py-4 font-medium text-slate-500 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-500">No invoices found.</td></tr>
                    ) : (
                        invoices.map(invoice => (
                            <tr key={invoice.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-mono font-medium">{invoice.invoiceNumber}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium">{invoice.clientName}</div>
                                    <div className="text-xs text-slate-500">{invoice.clientEmail}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div>{new Date(invoice.date).toLocaleDateString()}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 font-medium">{formatMoney(invoice.total)}</td>
                                <td className="px-6 py-4">
                                    <Badge status={invoice.status} />
                                    {getDueAlert(invoice)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button 
                                            variant="outline" 
                                            className="h-8 w-8 p-0 text-blue-600 border-blue-200 hover:bg-blue-50" 
                                            title="Send Email"
                                            onClick={() => openSendModal(invoice)}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="h-8 w-8 p-0" 
                                            title="Duplicate"
                                            onClick={() => navigate('create', { state: { duplicateInvoice: invoice } })}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Link to={`/catalog/${org.slug}/invoice/${invoice.id}`} target="_blank">
                                            <Button variant="outline" className="h-8 w-8 p-0" title="View/Print">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </Card>

      {/* Send Email Modal */}
      {sendingInvoice && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg bg-white p-6 relative animate-fade-in-up">
                  <button 
                    onClick={() => setSendingInvoice(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      Send Invoice {sendingInvoice.invoiceNumber}
                  </h3>

                  <div className="mb-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block flex justify-between">
                          <span>Email Message</span>
                          {isGeneratingEmail && <span className="text-xs text-blue-600 flex items-center"><Sparkles className="w-3 h-3 mr-1 animate-spin" /> AI Generating...</span>}
                      </label>
                      <textarea 
                        className="w-full h-40 p-3 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Drafting email..."
                      />
                      <p className="text-xs text-slate-400 mt-2">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          Generated by Gemini AI. Feel free to edit before sending.
                      </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setSendingInvoice(null)}>Cancel</Button>
                      <Button onClick={confirmSend} isLoading={isSending}>Send Email</Button>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};

export default Invoices;