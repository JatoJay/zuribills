
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { seedDatabase } from './services/storage';

// Pages
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Services from './pages/admin/Services';
import Invoices from './pages/admin/Invoices';
import InvoiceCreate from './pages/admin/InvoiceCreate';
import Clients from './pages/admin/Clients';
import Settings from './pages/admin/Settings';
import CatalogLayout from './pages/public/CatalogLayout';
import Catalog from './pages/public/Catalog';
import Checkout from './pages/public/Checkout';
import Success from './pages/public/Success';
import InvoiceView from './pages/public/InvoiceView';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Admin Routes */}
        <Route path="/org/:slug" element={<AdminLayout />}>
           <Route index element={<Dashboard />} />
           <Route path="services" element={<Services />} />
           <Route path="invoices" element={<Invoices />} />
           <Route path="invoices/create" element={<InvoiceCreate />} />
           <Route path="clients" element={<Clients />} />
           <Route path="settings" element={<Settings />} />
        </Route>

        {/* Public Customer Routes */}
        <Route path="/catalog/:slug" element={<CatalogLayout />}>
          <Route index element={<Catalog />} />
          <Route path="cart" element={<Checkout />} />
          <Route path="success/:invoiceId" element={<Success />} />
          <Route path="invoice/:invoiceId" element={<InvoiceView />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;