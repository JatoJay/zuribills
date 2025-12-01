
import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Organization } from '../../types';
import { updateOrganization } from '../../services/storage';
import { Button, Input, Card, Select } from '../../components/ui';
import { Upload, ImageIcon, X, AlertCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const { org, refreshOrg } = useOutletContext<{ org: Organization, refreshOrg: () => void }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState<Organization>({
    id: '',
    name: '',
    slug: '',
    logoUrl: '',
    primaryColor: '',
    currency: 'USD',
    contactEmail: '',
    contactPhone: '',
    address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
    },
    createdAt: ''
  });

  useEffect(() => {
    if (org) {
      setFormData({
          ...org,
          address: org.address || { street: '', city: '', state: '', zip: '', country: '' }
      });
    }
  }, [org]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { 
          setMessage({ type: 'error', text: 'Image size must be less than 500KB.' });
          e.target.value = ''; // Reset input
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
        setMessage(null);
      };
      reader.readAsDataURL(file);
    }
    // Reset input to allow re-selecting the same file if needed
    e.target.value = '';
  };

  const updateAddress = (field: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        address: { 
            street: '', city: '', state: '', zip: '', country: '', 
            ...(prev.address || {}),
            [field]: value 
        }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      await updateOrganization(formData);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
      
      // If slug changed, we must redirect to the new URL
      if (org && formData.slug !== org.slug) {
         navigate(`/org/${formData.slug}/settings`, { replace: true });
      } else {
         if (refreshOrg) refreshOrg();
      }

    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  if (!org) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Organization Settings</h2>
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
                <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${
                    message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                    <AlertCircle className="w-4 h-4" />
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                    label="Organization Name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required 
                />
                <div>
                    <Input 
                        label="URL Slug" 
                        value={formData.slug} 
                        onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                        required 
                    />
                    <p className="text-xs text-slate-500 mt-1.5 ml-0.5">
                        Catalog URL: <span className="font-mono bg-slate-100 px-1 rounded">/catalog/{formData.slug || 'slug'}</span>
                    </p>
                </div>
            </div>
            
            {/* Logo Upload Section */}
            <div>
                <label className="text-sm font-medium leading-none mb-3 block">Organization Logo</label>
                <div className="flex items-start gap-6">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center group">
                        {formData.logoUrl ? (
                            <img src={formData.logoUrl} alt="Org Logo" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="h-8 w-8 mb-1" />
                                <span className="text-[10px] uppercase font-bold">No Logo</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 border border-slate-200 hover:bg-slate-100 text-slate-900 h-9 py-2 px-4 shadow-sm">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Logo
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />
                            </label>
                            {formData.logoUrl && (
                                <Button 
                                    type="button"
                                    variant="outline"
                                    className="h-9 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    onClick={() => setFormData({...formData, logoUrl: ''})}
                                >
                                    <X className="w-4 h-4 mr-2" /> Remove
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Recommended size: 200x200px. <br/>
                            Supported formats: JPG, PNG. Max size: 500KB.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                    label="Contact Email" 
                    type="email"
                    value={formData.contactEmail} 
                    onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                    required 
                />
                <Input 
                    label="Contact Phone" 
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.contactPhone || ''} 
                    onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                />
            </div>

            <div className="pt-4 border-t border-slate-100">
                <h3 className="text-lg font-medium mb-4">Business Address</h3>
                <div className="space-y-4">
                    <Input 
                        label="Street Address" 
                        placeholder="123 Business Rd"
                        value={formData.address?.street} 
                        onChange={(e) => updateAddress('street', e.target.value)} 
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Input 
                            label="City" 
                            placeholder="San Francisco"
                            value={formData.address?.city} 
                            onChange={(e) => updateAddress('city', e.target.value)} 
                        />
                         <Input 
                            label="State" 
                            placeholder="CA"
                            value={formData.address?.state} 
                            onChange={(e) => updateAddress('state', e.target.value)} 
                        />
                         <Input 
                            label="Zip Code" 
                            placeholder="94105"
                            value={formData.address?.zip} 
                            onChange={(e) => updateAddress('zip', e.target.value)} 
                        />
                    </div>
                    <Input 
                        label="Country" 
                        placeholder="USA"
                        value={formData.address?.country} 
                        onChange={(e) => updateAddress('country', e.target.value)} 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <Input 
                    label="Brand Color" 
                    type="color"
                    className="h-10 p-1"
                    value={formData.primaryColor} 
                    onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                />
                
                <Select 
                    label="Default Currency"
                    options={[
                        { label: 'USD ($)', value: 'USD' },
                        { label: 'EUR (€)', value: 'EUR' },
                        { label: 'GBP (£)', value: 'GBP' },
                    ]}
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button type="submit" isLoading={loading}>
                    Save Changes
                </Button>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default Settings;
