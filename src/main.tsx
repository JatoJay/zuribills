import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'
import { seedDatabase } from '@/services/storage';
import { registerSW } from 'virtual:pwa-register';

seedDatabase().catch((error) => {
    console.error('Seed database failed', error);
});

if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        registerSW({
            immediate: true,
            onOfflineReady() {
                console.log('InvoiceFlow is ready to work offline.');
            },
        });
    } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
        });
    }
}

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
