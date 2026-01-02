import React, { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { Outlet, useParams, useNavigate } from '@tanstack/react-router';
import { getOrganizationBySlug } from '@/services/storage';
import { Organization, Service } from '@/types';
import { ShoppingCart, X, Trash2 } from 'lucide-react';
import { Button, formatCurrency } from '@/components/ui';
import { CartContext, CartItem } from '@/context/CartContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';

interface CatalogContextType {
    org: Organization;
}

export const CatalogContext = createContext<CatalogContextType | null>(null);

export const useCatalogContext = () => {
    const context = useContext(CatalogContext);
    if (!context) throw new Error('useCatalogContext must be used within CatalogLayout');
    return context;
};

const CatalogLayout: React.FC = () => {
    const params = useParams({ strict: false });
    const slug = (params as any).slug;
    const [org, setOrg] = useState<Organization | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const translationStrings = useMemo(() => ([
        'Loading...',
        'Cart',
        'Close',
        'Your Cart',
        'Your cart is empty',
        'Total',
        'Checkout',
    ]), []);
    const { t, setLanguage } = useTranslation(translationStrings);

    useEffect(() => {
        console.log('CatalogLayout mounted, slug:', slug);
        if (slug) {
            getOrganizationBySlug(slug).then(data => {
                if (data) setOrg(data);
            }).catch(err => console.error('getOrganizationBySlug error:', err));
        }
    }, [slug]);

    useEffect(() => {
        if (org?.preferredLanguage) {
            setLanguage(org.preferredLanguage);
        }
    }, [org?.preferredLanguage, setLanguage]);

    const addToCart = (service: Service) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === service.id);
            if (existing) {
                return prev.map(item => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...service, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (serviceId: string) => {
        setCart(prev => prev.filter(item => item.id !== serviceId));
    };

    const updateQuantity = (serviceId: string, quantity: number) => {
        setCart(prev => prev.map(item =>
            item.id === serviceId ? { ...item, quantity: Math.max(1, quantity) } : item
        ));
    };

    const clearCart = () => setCart([]);

    if (!org) return <div className="p-8 text-center text-foreground">{t('Loading...')}</div>;

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isCatalogEnabled = org.catalogEnabled !== false;

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, isCartOpen, setIsCartOpen }}>
            <CatalogContext.Provider value={{ org }}>
                <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
                    {/* Header */}
                    <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
                        <div className="w-full px-4 h-16 flex items-center justify-between">
                            <div className="font-bold text-xl text-foreground">{org.name}</div>
                            <div className="flex items-center gap-3">
                                <ThemeToggle />
                                {isCatalogEnabled && (
                                    <Button variant="outline" onClick={() => setIsCartOpen(!isCartOpen)} className={`relative ${isCartOpen ? 'bg-primary/10 border-primary/20 text-primary' : ''}`}>
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        {isCartOpen ? t('Close') : t('Cart')}
                                        {cart.length > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-primary text-background text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                                                {cart.reduce((acc, i) => acc + i.quantity, 0)}
                                            </span>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Main Layout Area */}
                    <div className="flex flex-1 relative overflow-hidden">
                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto h-[calc(100vh-4rem)]">
                            <main className="max-w-7xl mx-auto px-4 py-8">
                                <Outlet />
                            </main>
                        </div>

                        {/* Desktop Sidebar (Resizes Content) */}
                        {isCatalogEnabled && (
                            <aside className={`
                                hidden lg:flex flex-col w-96 border-l border-border bg-surface
                                transition-all duration-300 ease-in-out h-[calc(100vh-4rem)]
                                ${isCartOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 w-0 border-none overflow-hidden'}
                            `}>
                            {isCartOpen && <CartContent cart={cart} org={org} removeFromCart={removeFromCart} cartTotal={cartTotal} closeCart={() => setIsCartOpen(false)} isMobile={false} slug={slug} t={t} />}
                        </aside>
                        )}

                        {/* Mobile Overlay (Modal) */}
                        {isCatalogEnabled && isCartOpen && (
                            <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
                                <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-slide-in-right">
                                    <CartContent cart={cart} org={org} removeFromCart={removeFromCart} cartTotal={cartTotal} closeCart={() => setIsCartOpen(false)} isMobile={true} slug={slug} t={t} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CatalogContext.Provider>
        </CartContext.Provider>
    );
};

// Extracted Cart Content for reuse
const CartContent = ({ cart, org, removeFromCart, cartTotal, closeCart, isMobile, slug, t }: any) => {
    const navigate = useNavigate();

    const handleCheckout = () => {
        closeCart();
        navigate({ to: '/catalog/$slug/checkout', params: { slug } });
    };

    return (
        <>
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50">
                <h2 className="font-bold text-lg text-foreground">{t('Your Cart')}</h2>
                {isMobile && (
                    <button onClick={closeCart} className="p-2 hover:bg-surface/80 rounded-full transition-colors text-muted">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
                        <ShoppingCart className="w-16 h-16 opacity-20" />
                        <p>{t('Your cart is empty')}</p>
                    </div>
                ) : (
                    cart.map((item: any) => (
                        <div key={item.id} className="flex gap-4 items-center border-b border-border pb-4 last:border-0">
                            {item.imageUrl && (
                                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-border">
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h4 className="font-medium text-foreground text-sm">{item.name}</h4>
                                <p className="text-xs text-muted mt-1">
                                    {formatCurrency(item.price, org.currency)} x {item.quantity}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-foreground text-sm">
                                    {formatCurrency(item.price * item.quantity, org.currency)}
                                </span>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-muted hover:text-red-500 transition-colors p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 border-t border-border bg-surface/50">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-muted">{t('Total')}</span>
                    <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(cartTotal, org.currency)}
                    </span>
                </div>
                <Button className="w-full h-12 text-lg bg-primary hover:bg-secondary text-background shadow-neon" disabled={cart.length === 0} onClick={handleCheckout}>
                    {t('Checkout')}
                </Button>
            </div>
        </>
    );
};

export default CatalogLayout;
