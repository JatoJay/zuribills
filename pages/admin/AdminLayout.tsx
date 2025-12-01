import React, { useEffect, useState } from 'react';
import { Outlet, useParams, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, FileText, Settings, LogOut, ExternalLink, Users } from 'lucide-react';
import { getOrganizationBySlug } from '../../services/storage';
import { Organization } from '../../types';

const AdminLayout: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshOrg = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (slug) {
        getOrganizationBySlug(slug).then(o => {
            if (o) setOrg(o);
            else navigate('/');
        });
    }
  }, [slug, navigate, refreshTrigger]);

  const formatMoney = (amount: number, currencyCode?: string) => {
    if (!org) return '';
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currencyCode || org.currency 
    }).format(amount);
  };

  if (!org) return <div className="p-8">Loading...</div>;

  const navItemClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
            <h1 className="font-bold text-lg truncate">{org.name}</h1>
            <p className="text-xs text-slate-500">Admin Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
            <NavLink to={`/org/${slug}`} end className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" /> Overview
            </NavLink>
            <NavLink to={`/org/${slug}/services`} className={navItemClass}>
                <ShoppingBag className="w-4 h-4" /> Services
            </NavLink>
            <NavLink to={`/org/${slug}/invoices`} className={navItemClass}>
                <FileText className="w-4 h-4" /> Invoices
            </NavLink>
            <NavLink to={`/org/${slug}/clients`} className={navItemClass}>
                <Users className="w-4 h-4" /> Clients
            </NavLink>
            <NavLink to={`/org/${slug}/settings`} className={navItemClass}>
                <Settings className="w-4 h-4" /> Settings
            </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
            <a 
                href={`#/catalog/${slug}`} 
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
            >
                <ExternalLink className="w-4 h-4" /> Public Catalog
            </a>
            <button 
                onClick={() => navigate('/')} 
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
                <LogOut className="w-4 h-4" /> Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        <Outlet context={{ org, refreshOrg, formatMoney }} />
      </main>
    </div>
  );
};

export default AdminLayout;