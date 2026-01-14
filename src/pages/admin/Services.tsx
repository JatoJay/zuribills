import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Service } from '@/types';
import { getServices, createService, updateService, deleteService } from '@/services/storage';
import { Button, Input, Card, formatCurrency } from '@/components/ui';
import { generateServiceDescription } from '@/services/geminiService';
import { Plus, Trash2, Wand2, Search, Edit2 } from 'lucide-react';

import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

const Services: React.FC = () => {
    const { org } = useAdminContext();
    const translationStrings = useMemo(() => ([
        'Services',
        'Search services...',
        'Add Service',
        'Add',
        'No services found matching',
        'No services available. Create one to get started.',
        'Add New Service',
        'Service Name',
        'Category',
        'Description',
        'Generate with AI',
        'Price',
        'Image URL',
        'Cancel',
        'Save Service',
        'Update Service',
        'Edit Service',
        'Please enter a Name and Category first.',
        'Are you sure?',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [services, setServices] = useState<Service[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const loadRequestId = useRef(0);

    // Form State
    const [serviceForm, setServiceForm] = useState<Partial<Service>>({
        name: '',
        price: 0,
        category: '',
        description: '',
        imageUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const loadServices = async (orgId: string) => {
        const requestId = ++loadRequestId.current;
        const data = await getServices(orgId);
        if (requestId !== loadRequestId.current) return;
        setServices(data.filter(service => service.organizationId === orgId));
    };

    useEffect(() => {
        if (!org?.id) {
            setServices([]);
            return;
        }
        loadServices(org.id);
    }, [org?.id]);

    const handleGenerateDescription = async () => {
        if (!serviceForm.name || !serviceForm.category) {
            alert(t('Please enter a Name and Category first.'));
            return;
        }
        setAiLoading(true);
        const generated = await generateServiceDescription(serviceForm.name, serviceForm.category);
        setServiceForm(prev => ({ ...prev, description: generated }));
        setAiLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (org && serviceForm.name) {
            if (editingId) {
                await updateService({
                    ...serviceForm,
                    id: editingId,
                    organizationId: org.id,
                    name: serviceForm.name!,
                    price: Number(serviceForm.price),
                    category: serviceForm.category || 'General',
                    description: serviceForm.description || '',
                    imageUrl: serviceForm.imageUrl || '',
                    isActive: true
                } as Service);
            } else {
                await createService({
                    organizationId: org.id,
                    name: serviceForm.name!,
                    price: Number(serviceForm.price),
                    category: serviceForm.category || 'General',
                    description: serviceForm.description || '',
                    imageUrl: serviceForm.imageUrl || '',
                    isActive: true
                });
            }
            handleCloseModal();
            loadServices(org.id);
        }
        setLoading(false);
    };

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setServiceForm({
            name: service.name,
            price: service.price,
            category: service.category,
            description: service.description,
            imageUrl: service.imageUrl
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setServiceForm({ name: '', price: 0, category: '', description: '', imageUrl: '' });
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('Are you sure?'))) {
            await deleteService(id);
            loadServices(org.id);
        }
    }

    const normalizedSearch = searchTerm.toLowerCase();
    const filteredServices = services.filter(service =>
        service.organizationId === org?.id && (
            service.name.toLowerCase().includes(normalizedSearch) ||
            service.description.toLowerCase().includes(normalizedSearch) ||
            service.category.toLowerCase().includes(normalizedSearch)
        )
    );

    if (!org.id) return <div className="p-8">Loading...</div>;
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-foreground">{t('Services')}</h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('Search services...')}
                            className="w-full h-11 rounded-lg border border-border bg-surface pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" /> <span className="hidden md:inline">{t('Add Service')}</span><span className="md:hidden">{t('Add')}</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.length > 0 ? (
                    filteredServices.map(service => (
                        <Card key={service.id} className="overflow-hidden flex flex-col justify-between">
                            {service.imageUrl && (
                                <div className="h-48 w-full overflow-hidden border-b border-border">
                                    <img
                                        src={service.imageUrl}
                                        alt={service.name}
                                        className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            )}
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">{service.category}</span>
                                    <h3 className="font-bold text-lg text-primary">{formatCurrency(service.price, org.currency)}</h3>
                                </div>
                                <h4 className="font-semibold mb-2 text-foreground">{service.name}</h4>
                                <p className="text-sm text-muted line-clamp-2">{service.description}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                                <button onClick={() => handleEdit(service)} className="text-muted hover:text-primary p-1 transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(service.id)} className="text-red-500 hover:text-red-400 p-1 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted bg-surface/50 rounded-lg border border-dashed border-border">
                        {searchTerm ? (
                            <p>{t('No services found matching')} "{searchTerm}"</p>
                        ) : (
                            <p>{t('No services available. Create one to get started.')}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4 text-foreground">{editingId ? t('Edit Service') : t('Add New Service')}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label={t('Service Name')}
                                value={serviceForm.name}
                                onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                                required
                            />
                            <Input
                                label={t('Category')}
                                value={serviceForm.category}
                                onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                                required
                            />
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-2 block text-foreground">{t('Description')}</label>
                                    <textarea
                                        className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                                        rows={3}
                                        value={serviceForm.description}
                                        onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="mb-1"
                                    title={t('Generate with AI')}
                                    onClick={handleGenerateDescription}
                                    isLoading={aiLoading}
                                >
                                    <Wand2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <Input
                                label={t('Price')}
                                type="number"
                                min="0"
                                value={serviceForm.price}
                                onChange={e => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                                required
                            />

                            <Input
                                label={t('Image URL')}
                                placeholder="https://example.com/image.jpg"
                                value={serviceForm.imageUrl}
                                onChange={e => setServiceForm({ ...serviceForm, imageUrl: e.target.value })}
                            />

                            <div className="flex gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">{t('Cancel')}</Button>
                                <Button type="submit" isLoading={loading} className="flex-1">{editingId ? t('Update Service') : t('Save Service')}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Services;
