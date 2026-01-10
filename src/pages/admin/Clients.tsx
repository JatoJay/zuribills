
import React, { useEffect, useMemo, useState } from 'react';
import { Client } from '@/types';
import { getClients, createClient, updateClient, deleteClient } from '@/services/storage';
import { Button, Input, Card } from '@/components/ui';
import { Plus, Trash2, Edit2, Search, Mail, Phone, MapPin } from 'lucide-react';
import { useAdminContext } from './AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

const Clients: React.FC = () => {
    const { org } = useAdminContext();
    const translationStrings = useMemo(() => ([
        'Clients',
        'Search clients...',
        'Add Client',
        'Edit',
        'No clients found. Add one to get started.',
        'Edit Client',
        'Add New Client',
        'Client Name',
        'Company (Optional)',
        'Email Address',
        'Phone Number',
        'Address Details',
        'Street Address',
        'City',
        'State',
        'Zip',
        'Country',
        'Cancel',
        'Save Client',
        'Are you sure you want to delete this client?',
    ]), []);
    const { t } = useTranslation(translationStrings);
    const [clients, setClients] = useState<Client[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Form State
    const initialFormState = {
        id: '',
        name: '',
        email: '',
        company: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState(false);

    const loadClients = () => {
        if (org) getClients(org.id).then(setClients);
    };

    useEffect(() => {
        loadClients();
    }, [org]);

    const handleEdit = (client: Client) => {
        setFormData({
            id: client.id,
            name: client.name,
            email: client.email,
            company: client.company || '',
            phone: client.phone || '',
            street: client.address?.street || '',
            city: client.address?.city || '',
            state: client.address?.state || '',
            zip: client.address?.zip || '',
            country: client.address?.country || ''
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleOpenCreate = () => {
        setFormData(initialFormState);
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const clientData: any = {
            organizationId: org.id,
            name: formData.name,
            email: formData.email,
            company: formData.company,
            phone: formData.phone,
            address: {
                street: formData.street,
                city: formData.city,
                state: formData.state,
                zip: formData.zip,
                country: formData.country
            }
        };

        if (isEditing) {
            await updateClient({ ...clientData, id: formData.id, createdAt: new Date().toISOString() });
        } else {
            await createClient(clientData);
        }

        setLoading(false);
        setIsModalOpen(false);
        loadClients();
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('Are you sure you want to delete this client?'))) {
            await deleteClient(id);
            loadClients();
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!org.id) return <div className="p-8">Loading...</div>;
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-foreground">{t('Clients')}</h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('Search clients...')}
                            className="w-full h-11 rounded-lg border border-border bg-surface pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleOpenCreate} className="shrink-0">
                        <Plus className="w-4 h-4 mr-2" /> {t('Add Client')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                        <Card key={client.id} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-foreground">{client.name}</h3>
                                    {client.company && <span className="text-xs bg-primary/10 px-2 py-1 rounded text-primary">{client.company}</span>}
                                </div>
                                <div className="space-y-2 text-sm text-muted mt-4">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted" />
                                        <a href={`mailto:${client.email}`} className="hover:underline hover:text-foreground">{client.email}</a>
                                    </div>
                                    {client.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-muted" />
                                            <span>{client.phone}</span>
                                        </div>
                                    )}
                                    {(client.address?.city || client.address?.country) && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 text-muted mt-0.5" />
                                            <span>
                                                {[client.address.city, client.address.state, client.address.country].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                                <Button variant="outline" className="h-8 px-2" onClick={() => handleEdit(client)}>
                                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                                </Button>
                                <Button variant="outline" className="h-8 px-2 text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={() => handleDelete(client.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 text-muted bg-surface/50 rounded-lg border border-dashed border-border">
                        <p>{t('No clients found. Add one to get started.')}</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
                    <Card className="w-full max-w-2xl p-6 my-8">
                        <h3 className="text-lg font-bold mb-4 text-foreground">{isEditing ? t('Edit Client') : t('Add New Client')}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label={t('Client Name')}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label={t('Company (Optional)')}
                                    value={formData.company}
                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label={t('Email Address')}
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                <Input
                                    label={t('Phone Number')}
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 border-t border-border">
                                <h4 className="text-sm font-medium mb-3 text-foreground">{t('Address Details')}</h4>
                                <div className="space-y-4">
                                    <Input
                                        label={t('Street Address')}
                                        value={formData.street}
                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Input
                                            label={t('City')}
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                        <Input
                                            label={t('State')}
                                            value={formData.state}
                                            onChange={e => setFormData({ ...formData, state: e.target.value })}
                                        />
                                        <Input
                                            label={t('Zip')}
                                            value={formData.zip}
                                            onChange={e => setFormData({ ...formData, zip: e.target.value })}
                                        />
                                        <Input
                                            label={t('Country')}
                                            value={formData.country}
                                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">{t('Cancel')}</Button>
                                <Button type="submit" isLoading={loading} className="flex-1">{t('Save Client')}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Clients;
