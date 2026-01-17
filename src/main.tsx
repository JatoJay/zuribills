import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'
import { seedDatabase } from '@/services/storage';
import { registerSW } from 'virtual:pwa-register';

// Notification for offline readiness
const showOfflineReady = () => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:w-80 bg-slate-900 text-white p-4 rounded-xl shadow-lift z-[9999] flex items-center justify-between animate-fade-in-up border border-white/10';
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p class="text-sm font-medium">Ready to work offline</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-xs text-white/50 hover:text-white uppercase tracking-wider font-bold">Dismiss</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
};

// Notification for connection status
const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    const existing = document.getElementById('connection-status');
    if (existing) existing.remove();

    if (!isOnline) {
        const banner = document.createElement('div');
        banner.id = 'connection-status';
        banner.className = 'fixed top-0 left-0 right-0 bg-amber-500 text-amber-950 px-4 py-1.5 text-center text-xs font-bold z-[10000] flex items-center justify-center gap-2';
        banner.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M8.5 8.5a5 5 0 0 1 7 7"/><path d="M16.51 11a8 8 0 0 1 2 2"/><path d="M2 8a12 12 0 0 1 18.06-4"/><path d="M10.75 20.25a2 2 0 0 1-3.5 0"/></svg>
            Offline Mode: Changes will sync when reconnected
        `;
        document.body.appendChild(banner);
    }
};

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

seedDatabase().catch((error) => {
    console.error('Seed database failed', error);
});

if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        registerSW({
            immediate: true,
            onOfflineReady() {
                console.log('InvoiceFlow is ready to work offline.');
                showOfflineReady();
            },
        });
    } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
        });
    }
}

updateOnlineStatus();

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
)
