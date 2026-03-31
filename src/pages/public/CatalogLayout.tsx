import React, { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { Outlet, useParams, useNavigate, useRouterState } from '@tanstack/react-router';
import { getOrganizationBySlug } from '@/services/storage';
import { Organization, Service } from '@/types';
import { ShoppingCart, X, Trash2 } from 'lucide-react';
import { Button, formatCurrency } from '@/components/ui';
import { CartContext, CartItem } from '@/context/CartContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useTranslation } from '@/hooks/useTranslation';
import { LANGUAGE_SOURCE_KEY } from '@/context/TranslationContext';

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
    const isSuccessRoute = useRouterState({
        select: (state) => state.location.pathname.includes('/success/'),
    });
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
        if (!org?.preferredLanguage) return;
        const source = localStorage.getItem(LANGUAGE_SOURCE_KEY);
        if (source === 'user') return;
        localStorage.setItem(LANGUAGE_SOURCE_KEY, 'org');
        setLanguage(org.preferredLanguage);
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

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const isCatalogEnabled = Boolean(org && org.catalogEnabled !== false);
    const showCart = isCatalogEnabled && !isSuccessRoute;

    useEffect(() => {
        if (isSuccessRoute && isCartOpen) {
            setIsCartOpen(false);
        }
    }, [isSuccessRoute, isCartOpen]);

    if (!org) return <div className="p-8 text-center text-foreground">{t('Loading...')}</div>;

    const brandColor = org.primaryColor || '#0EA5A4';

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, isCartOpen, setIsCartOpen }}>
            <CatalogContext.Provider value={{ org }}>
                <div
                    className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col print:block print:min-h-0"
                    style={{ '--primary': brandColor } as React.CSSProperties}
                >
                    {/* Header */}
                    <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 print:hidden">
                        <div className="w-full px-4 h-16 flex items-center justify-between">
                            <div className="font-bold text-xl text-foreground">{org.name}</div>
                            <div className="flex items-center gap-3">
                                <ThemeToggle />
                                {showCart && (
                                    <button
                                        onClick={() => setIsCartOpen(!isCartOpen)}
                                        className="relative p-2 rounded-full hover:bg-surface transition-colors"
                                    >
                                        <ShoppingCart className="w-5 h-5 text-foreground" />
                                        {cart.length > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-xs font-bold flex items-center justify-center" style={{ color: '#0f172a' }}>
                                                {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto print:overflow-visible">
                        <main className={isSuccessRoute ? "w-full max-w-none px-4 py-8 flex justify-center print:block print:p-0" : "max-w-7xl mx-auto px-4 py-8 print:max-w-none print:p-0"}>
                            <Outlet />
                        </main>
                    </div>

                    {/* Cart Popover */}
                    {showCart && isCartOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsCartOpen(false)} />
                            <div className="fixed top-20 right-4 z-50 w-full max-w-sm bg-surface rounded-xl shadow-2xl border border-border flex flex-col max-h-[calc(100vh-6rem)] animate-fade-in-up">
                                <CartContent cart={cart} org={org} removeFromCart={removeFromCart} cartTotal={cartTotal} closeCart={() => setIsCartOpen(false)} slug={slug} t={t} />
                            </div>
                        </>
                    )}
                </div>
            </CatalogContext.Provider>
        </CartContext.Provider>
    );
};

const CartContent = ({ cart, org, removeFromCart, cartTotal, closeCart, slug, t }: any) => {
    const navigate = useNavigate();

    const handleCheckout = () => {
        closeCart();
        navigate({ to: '/catalog/$slug/checkout', params: { slug } });
    };

    return (
        <>
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50 rounded-t-xl">
                <h2 className="font-bold text-lg text-foreground">{t('Your Cart')}</h2>
                <button onClick={closeCart} className="p-2 hover:bg-surface/80 rounded-full transition-colors text-muted">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80">
                {cart.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-muted space-y-4">
                        <ShoppingCart className="w-12 h-12 opacity-20" />
                        <p className="text-sm">{t('Your cart is empty')}</p>
                    </div>
                ) : (
                    cart.map((item: any) => (
                        <div key={item.id} className="flex gap-3 items-center border-b border-border pb-3 last:border-0">
                            {item.imageUrl && (
                                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-border">
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground text-sm truncate">{item.name}</h4>
                                <p className="text-xs text-muted mt-0.5">
                                    {formatCurrency(item.price, org.currency)} x {item.quantity}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
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

            <div className="p-4 border-t border-border bg-surface/50 rounded-b-xl">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-muted text-sm">{t('Total')}</span>
                    <span className="text-xl font-bold text-foreground">
                        {formatCurrency(cartTotal, org.currency)}
                    </span>
                </div>
                <Button className="w-full h-10 bg-primary hover:bg-secondary text-background" disabled={cart.length === 0} onClick={handleCheckout}>
                    {t('Checkout')}
                </Button>
            </div>
        </>
    );
};

export default CatalogLayout;
