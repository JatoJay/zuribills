import React, { useEffect, useState, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Organization, Service } from '../../types';
import { getServices } from '../../services/storage';
import { Button, Card, formatCurrency } from '../../components/ui';
import { CartContext } from './CatalogLayout';
import { Plus } from 'lucide-react';

const Catalog: React.FC = () => {
  const { org } = useOutletContext<{ org: Organization }>();
  const { addToCart } = useContext(CartContext);
  const [services, setServices] = useState<Service[]>([]);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    if (org) getServices(org.id).then(setServices);
  }, [org]);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];
  const filtered = category === 'All' ? services : services.filter(s => s.category === category);

  return (
    <div>
        <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">Our Services</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">Select from our professional services below to generate an invoice instantly.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {categories.map(c => (
                <button 
                    key={c} 
                    onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${category === c ? 'bg-black text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                    {c}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(service => (
                <Card key={service.id} className="p-6 flex flex-col hover:shadow-lg transition-shadow duration-200 border-slate-200">
                    <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{service.category}</div>
                        <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-3">{service.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-lg">{formatCurrency(service.price, org.currency)}</span>
                        <Button onClick={() => addToCart({ ...service, quantity: 1 })}>
                            <Plus className="w-4 h-4 mr-2" /> Add
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
};

export default Catalog;
