import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Organization, Service } from '../../types';
import { getServices, createService, deleteService } from '../../services/storage';
import { Button, Input, Card, formatCurrency } from '../../components/ui';
import { Plus, Trash2, Wand2, Search } from 'lucide-react';
import { generateServiceDescription } from '../../services/geminiService';

const Services: React.FC = () => {
  const { org } = useOutletContext<{ org: Organization }>();
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    price: 0,
    category: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const loadServices = () => {
    if (org) getServices(org.id).then(setServices);
  };

  useEffect(() => {
    loadServices();
  }, [org]);

  const handleGenerateDescription = async () => {
      if (!newService.name || !newService.category) {
          alert("Please enter a Name and Category first.");
          return;
      }
      setAiLoading(true);
      const desc = await generateServiceDescription(newService.name, newService.category);
      setNewService(prev => ({ ...prev, description: desc }));
      setAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if(org && newService.name) {
        await createService({
            organizationId: org.id,
            name: newService.name!,
            price: Number(newService.price),
            category: newService.category || 'General',
            description: newService.description || '',
            isActive: true
        });
        setNewService({ name: '', price: 0, category: '', description: '' });
        setIsModalOpen(false);
        loadServices();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
      if(confirm('Are you sure?')) {
          await deleteService(id);
          loadServices();
      }
  }

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Services</h2>
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search services..." 
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Add Service</span><span className="md:hidden">Add</span>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length > 0 ? (
            filteredServices.map(service => (
                <Card key={service.id} className="p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{service.category}</span>
                            <h3 className="font-bold text-lg">{formatCurrency(service.price, org.currency)}</h3>
                        </div>
                        <h4 className="font-semibold mb-2">{service.name}</h4>
                        <p className="text-sm text-slate-600">{service.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                        <button onClick={() => handleDelete(service.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </Card>
            ))
        ) : (
            <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {searchTerm ? (
                    <p>No services found matching "{searchTerm}"</p>
                ) : (
                    <p>No services available. Create one to get started.</p>
                )}
            </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6 bg-white">
                <h3 className="text-lg font-bold mb-4">Add New Service</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                        label="Service Name" 
                        value={newService.name} 
                        onChange={e => setNewService({...newService, name: e.target.value})} 
                        required 
                    />
                     <Input 
                        label="Category" 
                        value={newService.category} 
                        onChange={e => setNewService({...newService, category: e.target.value})} 
                        required 
                    />
                    <div className="flex items-end gap-2">
                         <div className="flex-1">
                             <label className="text-sm font-medium mb-2 block">Description</label>
                             <textarea 
                                className="w-full border rounded-md p-2 text-sm border-slate-300"
                                rows={3}
                                value={newService.description}
                                onChange={e => setNewService({...newService, description: e.target.value})}
                             />
                         </div>
                         <Button 
                            type="button" 
                            variant="secondary" 
                            className="mb-1"
                            title="Generate with AI"
                            onClick={handleGenerateDescription}
                            isLoading={aiLoading}
                         >
                             <Wand2 className="w-4 h-4" />
                         </Button>
                    </div>
                   
                    <Input 
                        label="Price" 
                        type="number"
                        min="0"
                        value={newService.price} 
                        onChange={e => setNewService({...newService, price: Number(e.target.value)})} 
                        required 
                    />
                    
                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" isLoading={loading} className="flex-1">Save Service</Button>
                    </div>
                </form>
            </Card>
        </div>
      )}
    </div>
  );
};

export default Services;