import React, { useContext, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Organization, InvoiceStatus } from '../../types';
import { createInvoice } from '../../services/storage';
import { Button, Input, Card, formatCurrency } from '../../components/ui';
import { CartContext } from './CatalogLayout';
import { Trash2, ArrowLeft } from 'lucide-react';

const Checkout: React.FC = () => {
  const { org } = useOutletContext<{ org: Organization }>();
  const { cart, removeFromCart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
      e.preventDefault();
      if (cart.length === 0) return;
      
      setLoading(true);
      const invoice = await createInvoice({
          organizationId: org.id,
          clientName: formData.name,
          clientEmail: formData.email,
          clientCompany: formData.company,
          items: cart.map(c => ({
              id: crypto.randomUUID(),
              serviceId: c.id,
              description: c.name,
              quantity: c.quantity,
              unitPrice: c.price,
              total: c.price * c.quantity
          })),
          subtotal: total,
          taxRate: 0,
          taxAmount: 0,
          total: total,
          status: InvoiceStatus.DRAFT, // Customer created = Draft or Sent
          date: new Date().toISOString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 days
      });
      
      clearCart();
      setLoading(false);
      navigate(`../success/${invoice.id}`);
  };

  if (cart.length === 0) {
      return (
          <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
              <Button onClick={() => navigate(`../`)}>Browse Services</Button>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
            <div className="flex items-center mb-6 cursor-pointer text-slate-500 hover:text-black" onClick={() => navigate('../')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Continue Shopping
            </div>
            <h2 className="text-2xl font-bold mb-6">Review & Checkout</h2>
            <div className="space-y-4">
                {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-4">
                        <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-slate-500">{formatCurrency(item.price, org.currency)} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold">{formatCurrency(item.price * item.quantity, org.currency)}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
                <div className="flex justify-between items-center text-xl font-bold pt-4">
                    <span>Total</span>
                    <span>{formatCurrency(total, org.currency)}</span>
                </div>
            </div>
        </div>

        <div>
            <Card className="p-6 sticky top-24">
                <h3 className="font-bold mb-4">Customer Information</h3>
                <form onSubmit={handleCheckout} className="space-y-4">
                    <Input required label="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <Input required type="email" label="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <Input label="Company Name (Optional)" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                    
                    <div className="pt-4">
                        <Button type="submit" className="w-full h-12 text-lg" isLoading={loading}>
                            Generate Invoice
                        </Button>
                        <p className="text-xs text-center text-slate-400 mt-3">
                            An invoice will be generated and emailed to you immediately.
                        </p>
                    </div>
                </form>
            </Card>
        </div>
    </div>
  );
};

export default Checkout;
