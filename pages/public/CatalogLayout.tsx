import React, { useEffect, useState } from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import { getOrganizationBySlug } from '../../services/storage';
import { Organization, CartItem } from '../../types';
import { ShoppingCart } from 'lucide-react';

// Simple Context for Cart
export const CartContext = React.createContext<{
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
}>({ cart: [], addToCart: () => {}, removeFromCart: () => {}, clearCart: () => {} });

const CatalogLayout: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<Organization | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (slug) getOrganizationBySlug(slug).then(setOrg);
  }, [slug]);

  const addToCart = (item: CartItem) => {
      setCart(prev => {
          const existing = prev.find(i => i.id === item.id);
          if (existing) {
              return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
          }
          return [...prev, item];
      });
  };

  const removeFromCart = (id: string) => {
      setCart(prev => prev.filter(i => i.id !== id));
  };
  
  const clearCart = () => setCart([]);

  if (!org) return <div className="p-8 text-center">Loading Store...</div>;

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
        <div className="min-h-screen bg-white">
            <header className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {org.logoUrl && <img src={org.logoUrl} className="h-8 w-8 rounded" alt="logo" />}
                        <Link to={`/catalog/${slug}`} className="font-bold text-xl tracking-tight">{org.name}</Link>
                    </div>
                    <Link to={`/catalog/${slug}/cart`} className="relative p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ShoppingCart className="w-6 h-6 text-slate-700" />
                        {cart.length > 0 && (
                            <span className="absolute top-0 right-0 h-5 w-5 bg-black text-white text-xs flex items-center justify-center rounded-full">
                                {cart.reduce((acc, i) => acc + i.quantity, 0)}
                            </span>
                        )}
                    </Link>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-8">
                <Outlet context={{ org }} />
            </main>
            <footer className="border-t border-slate-100 py-8 text-center text-slate-500 text-sm">
                Powered by InvoiceFlow SaaS
            </footer>
        </div>
    </CartContext.Provider>
  );
};

export default CatalogLayout;
