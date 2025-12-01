import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { getOrganizationBySlug } from '../services/storage';
import { 
  ArrowRight, CheckCircle, Smartphone, Zap, Shield, 
  Menu, ShoppingCart, Plus, DollarSign 
} from 'lucide-react';

// --- Sub-components (Defined at top to avoid Initialization Errors) ---

const ShoppingBagIcon = ({className}: {className?: string}) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
);

const FeatureCard: React.FC<{icon: React.ReactNode, title: string, description: string}> = ({ icon, title, description }) => (
  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 transition-all hover:bg-slate-800 group">
    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2 text-slate-100">{title}</h3>
    <p className="text-slate-400 leading-relaxed">
      {description}
    </p>
  </div>
);

const InteractiveMobilePreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'admin' | 'client'>('client');
  const [cartCount, setCartCount] = useState(0);

  return (
    <div className="relative mx-auto border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl flex flex-col animate-float">
      {/* Notch */}
      <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
      <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
      <div className="rounded-[2rem] overflow-hidden w-full h-full bg-slate-50 flex flex-col relative">
        
        {/* Mobile Header */}
        <div className="bg-white p-4 pt-8 pb-3 shadow-sm flex justify-between items-center z-10 sticky top-0">
          <div className="font-bold text-slate-900 flex items-center gap-1">
             <div className={`w-2 h-2 rounded-full ${activeTab === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`}></div>
             {activeTab === 'admin' ? 'Dashboard' : 'Acme Inc.'}
          </div>
          <div className="flex gap-2">
            {activeTab === 'client' && (
                <div className="relative cursor-pointer" onClick={() => setCartCount(0)}>
                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                    {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>}
                </div>
            )}
             <Menu className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Mobile Content Scroll Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50">
           {activeTab === 'client' ? (
             <div className="p-4 space-y-4">
                <div className="bg-blue-600 rounded-xl p-4 text-white">
                   <h3 className="font-bold text-lg">Summer Sale</h3>
                   <p className="text-xs opacity-80 mb-2">Get 20% off all consultations.</p>
                   <button className="bg-white text-blue-600 text-xs px-3 py-1.5 rounded-full font-bold">Shop Now</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCartCount(c => c + 1)}>
                        <div className="h-20 bg-slate-100 rounded-md mb-2 flex items-center justify-center text-slate-300">
                           <ShoppingBagIcon className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-bold text-slate-900 mb-1">Service {i}</div>
                        <div className="flex justify-between items-center mt-auto">
                           <span className="text-xs font-medium text-slate-500">$99</span>
                           <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                             <Plus className="w-3 h-3" />
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           ) : (
             <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                     <div className="text-xs text-slate-500 mb-1">Revenue</div>
                     <div className="text-lg font-bold text-slate-900">$12.5k</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                     <div className="text-xs text-slate-500 mb-1">Invoices</div>
                     <div className="text-lg font-bold text-slate-900">142</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-3 border-b border-slate-50 text-xs font-bold text-slate-500 uppercase">Recent Activity</div>
                    {[1,2,3].map(i => (
                      <div key={i} className="p-3 flex items-center justify-between border-b border-slate-50 last:border-0">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                               <DollarSign className="w-4 h-4" />
                            </div>
                            <div>
                               <div className="text-xs font-bold text-slate-900">Inv #{1000+i} Paid</div>
                               <div className="text-[10px] text-slate-400">2 mins ago</div>
                            </div>
                         </div>
                         <div className="text-xs font-bold text-slate-900">+$250</div>
                      </div>
                    ))}
                </div>
             </div>
           )}
        </div>

        {/* Floating Toggle for Demo */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-1 py-1 rounded-full flex gap-1 shadow-lg z-20">
            <button 
              onClick={() => setActiveTab('client')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'client' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
            >
              Client App
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'admin' ? 'bg-purple-600' : 'hover:bg-slate-800'}`}
            >
              Admin View
            </button>
        </div>

      </div>
    </div>
  );
};

// --- Main Component ---

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError('');
    
    try {
      const org = await getOrganizationBySlug(slug);
      if (org) {
        navigate(`/org/${slug}`);
      } else {
        setError('Organization not found. Try "acme" or create a new one.');
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">InvoiceFlow</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#demo" className="text-slate-300 hover:text-white transition-colors">Mobile Demo</a>
              <Button onClick={() => navigate('/onboarding')} className="bg-blue-600 hover:bg-blue-500 text-white border-none">
                Get Started
              </Button>
            </div>
            <div className="md:hidden">
                <Button onClick={() => navigate('/onboarding')} className="text-xs px-3">Start</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          
          {/* Hero Content */}
          <div className="lg:w-1/2 z-10">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-800 text-blue-300 text-sm font-medium mb-6 animate-fade-in-up">
              🚀 The #1 SaaS for Service Businesses
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Invoicing Made <br/>
              <span className="text-blue-500">Effortless.</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed">
              Empower your business with a professional catalog, automated invoicing, and a seamless checkout experience for your clients. Mobile-ready and built for speed.
            </p>
            
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm max-w-md">
               <h3 className="text-sm font-semibold text-slate-300 mb-3">Login to Dashboard</h3>
               <form onSubmit={handleAdminLogin} className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      placeholder="e.g. acme" 
                      value={slug} 
                      onChange={e => setSlug(e.target.value)}
                      error={error}
                      className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:ring-blue-500"
                    />
                  </div>
                  <Button type="submit" isLoading={loading} className="bg-blue-600 hover:bg-blue-500 text-white border-none shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
               </form>
               <div className="mt-3 text-xs text-slate-500 flex justify-between">
                  <span>No account? <button onClick={() => navigate('/onboarding')} className="text-blue-400 hover:underline">Create Organization</button></span>
                  <span>Try: <button onClick={() => setSlug('acme')} className="text-slate-300 hover:underline">acme</button></span>
               </div>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Free Setup
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> No Credit Card
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> PWA Ready
              </div>
            </div>
          </div>

          {/* Hero Visual - Interactive Mobile Mockup */}
          <div className="lg:w-1/2 relative w-full flex justify-center lg:justify-end" id="demo">
             <div className="absolute top-0 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl -z-10" />
             <div className="absolute bottom-0 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -z-10" />
             
             {/* Mobile Frame */}
             <InteractiveMobilePreview />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Scale</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From service management to automated billing, InvoiceFlow handles the boring stuff so you can focus on work.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6 text-blue-400" />}
              title="Mobile First Design"
              description="Manage your business from your pocket. Our PWA installs directly to your home screen."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-purple-400" />}
              title="Secure Multi-Tenancy"
              description="Your data is isolated and secure. Give your clients a dedicated portal they can trust."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="Instant Invoicing"
              description="Clients can browse your catalog, build a cart, and generate professional invoices in seconds."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-blue-500" />
            </div>
            <span className="font-bold text-lg">InvoiceFlow</span>
          </div>
          <div className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} InvoiceFlow SaaS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;