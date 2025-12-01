import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, Select } from '../components/ui';
import { createOrganization } from '../services/storage';
import { ArrowLeft } from 'lucide-react';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    currency: 'USD',
    contactEmail: '',
    primaryColor: '#000000',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await createOrganization(formData);
        navigate(`/org/${formData.slug}`);
    } catch (err) {
        alert('Slug might already exist or invalid data.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <button onClick={() => navigate('/')} className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h1 className="text-2xl font-bold mb-2">Create your Organization</h1>
        <p className="text-slate-500 mb-6">Set up your business profile to start invoicing.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
                label="Business Name" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <Input 
                label="URL Slug" 
                placeholder="acme-corp"
                required
                value={formData.slug}
                onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
            />
            <Input 
                label="Contact Email" 
                type="email"
                required
                value={formData.contactEmail}
                onChange={e => setFormData({...formData, contactEmail: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Currency"
                    options={[
                        { label: 'USD ($)', value: 'USD' },
                        { label: 'EUR (€)', value: 'EUR' },
                        { label: 'GBP (£)', value: 'GBP' },
                    ]}
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                />
                <Input 
                    label="Brand Color"
                    type="color"
                    className="h-10 p-1"
                    value={formData.primaryColor}
                    onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                />
            </div>
            
            <Button type="submit" className="w-full mt-4" isLoading={loading}>
                Create & Dashboard
            </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;
