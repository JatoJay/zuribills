import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Service } from '@/types';
import { getServices } from '@/services/storage';
import { Button, Input, Card, formatCurrency } from '@/components/ui';
import { Search, ShoppingCart, Check, Filter } from 'lucide-react';
import { CartContext } from '@/context/CartContext';
import { useCatalogContext } from './CatalogLayout';
import { useTranslation } from '@/hooks/useTranslation';

const ALL_CATEGORY = 'All';

const Catalog: React.FC = () => {
    const { org } = useCatalogContext();
    const translationStrings = useMemo(() => ([
        'Catalog not published',
        'This business hasn’t published a public catalog yet. You can still reach out directly to place an order.',
        'Contact',
        'Browse our services and create your perfect package.',
        'Search services...',
        'No description available.',
        'Price',
        'No services found',
        'Try adjusting your search or category filter.',
        'Clear all filters',
        'Powered by',
        'All',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const { addToCart, setIsCartOpen } = useContext(CartContext);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    const loadServices = async () => {
        setLoading(true);
        try {
            const data = await getServices(org.id);
            setServices(data);
        } catch (error) {
            console.error("Failed to load services", error);
        } finally {
            setLoading(false);
        }
    };

    const catalogEnabled = org.catalogEnabled !== false;

    useEffect(() => {
        if (org && catalogEnabled) {
            loadServices();
        }
    }, [org, catalogEnabled]);

    if (!catalogEnabled) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <ShoppingCart className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('Catalog not published')}</h1>
                <p className="text-muted max-w-md">
                    {t('This business hasn’t published a public catalog yet. You can still reach out directly to place an order.')}
                </p>
                {org.contactEmail && (
                    <a
                        href={`mailto:${org.contactEmail}`}
                        className="mt-6 inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-surface transition-colors"
                    >
                        {t('Contact')} {org.name}
                    </a>
                )}
            </div>
        );
    }

    const categories = [ALL_CATEGORY, ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === ALL_CATEGORY || service.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleAddToCart = (service: Service) => {
        addToCart(service);
        setAddedIds(prev => new Set(prev).add(service.id));
        setIsCartOpen(true);

        // Reset the "Added" animation after 2 seconds
        setTimeout(() => {
            setAddedIds(prev => {
                const next = new Set(prev);
                next.delete(service.id);
                return next;
            });
        }, 2000);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                    {org.name}
                </h1>
                <p className="text-lg text-muted">
                    {t('Browse our services and create your perfect package.')}
                </p>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface/80 p-4 rounded-xl shadow-sm border border-border sticky top-20 z-10 backdrop-blur-md">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                    <Input
                        placeholder={t('Search services...')}
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto text-sm no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors border ${selectedCategory === cat
                                ? 'bg-primary text-background border-primary shadow-md'
                                : 'bg-surface text-muted border-border hover:bg-surface/80 hover:text-foreground'
                                }`}
                        >
                            {cat === ALL_CATEGORY ? t(cat) : cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.length > 0 ? (
                    filteredServices.map(service => (
                        <Card key={service.id} className="flex flex-col hover:shadow-xl transition-all duration-300 overflow-hidden group border-border hover:border-primary/50">
                            {service.imageUrl && (
                                <div className="h-56 w-full overflow-hidden relative">
                                    <img
                                        src={service.imageUrl}
                                        alt={service.name}
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">
                                            {service.category}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="p-6 flex-1 flex flex-col">
                                {!service.imageUrl && (
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
                                            {service.category}
                                        </span>
                                    </div>
                                )}

                                <h3 className="font-bold text-xl mb-2 text-foreground group-hover:text-primary transition-colors">
                                    {service.name}
                                </h3>

                                <p className="text-muted font-medium text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                                    {service.description || t('No description available.')}
                                </p>

                                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted font-bold uppercase">{t('Price')}</span>
                                        <span className="text-2xl font-extrabold text-foreground">
                                            {formatCurrency(service.price, org.currency)}
                                        </span>
                                    </div>

                                    <Button
                                        className={`transition-all duration-300 shadow-lg ${addedIds.has(service.id)
                                            ? 'bg-green-600 hover:bg-green-700 text-white border-none'
                                            : 'bg-primary hover:bg-secondary text-background border-none'
                                            }`}
                                        onClick={() => handleAddToCart(service)}
                                    >
                                        {addedIds.has(service.id) ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <ShoppingCart className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-muted">
                        <Filter className="w-12 h-12 mx-auto text-border mb-4" />
                        <h3 className="text-lg font-medium text-foreground">{t('No services found')}</h3>
                        <p>{t('Try adjusting your search or category filter.')}</p>
                        <Button variant="secondary" onClick={() => { setSearchTerm(''); setSelectedCategory(ALL_CATEGORY); }} className="mt-4">
                            {t('Clear all filters')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Visual Footer for Catalog */}
            <div className="mt-12 pt-8 border-t border-border text-center text-muted text-sm">
                {t('Powered by')} <span className="font-bold text-foreground">InvoiceFlow</span>
            </div>
        </div>
    );
};

export default Catalog;
