import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'
import { seedDatabase } from '@/services/storage';
import { registerSW } from 'virtual:pwa-register';

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
};

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = () => /Android/i.test(navigator.userAgent);

const showInstallPrompt = () => {
    if (isStandalone()) return;
    if (!isMobile()) return;

    const existing = document.getElementById('pwa-install-prompt');
    if (existing) existing.remove();

    const prompt = document.createElement('div');
    prompt.id = 'pwa-install-prompt';
    prompt.className = 'fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-[9999] border-t border-white/10';
    prompt.style.cssText = 'animation: slideUp 0.3s ease-out; padding-bottom: max(1rem, env(safe-area-inset-bottom));';

    const style = document.createElement('style');
    style.textContent = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }';
    document.head.appendChild(style);

    if (isIOS()) {
        prompt.innerHTML = `
            <div class="max-w-lg mx-auto">
                <div class="flex items-start gap-4">
                    <img src="/logo.svg" alt="ZuriBills" class="w-12 h-12 flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm">Install ZuriBills</p>
                        <p class="text-xs text-white/70 mt-1">Add to your home screen for quick access and offline use.</p>
                        <div class="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <p class="text-xs text-white/60">Tap <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mx-1 text-primary"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg> then <span class="font-semibold text-white">"Add to Home Screen"</span></p>
                        </div>
                    </div>
                    <button id="pwa-dismiss" class="text-white/40 hover:text-white p-1 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        `;
    } else {
        prompt.innerHTML = `
            <div class="max-w-lg mx-auto">
                <div class="flex items-center gap-4">
                    <img src="/logo.svg" alt="ZuriBills" class="w-12 h-12 flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-sm">Install ZuriBills</p>
                        <p class="text-xs text-white/70 mt-0.5">Add to home screen for quick access</p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button id="pwa-dismiss" class="px-3 py-2 text-xs text-white/50 hover:text-white font-medium">Later</button>
                        <button id="pwa-install" class="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">Install</button>
                    </div>
                </div>
            </div>
        `;
    }

    document.body.appendChild(prompt);

    document.getElementById('pwa-dismiss')?.addEventListener('click', () => {
        prompt.remove();
        sessionStorage.setItem('pwa-dismissed', 'true');
    });

    document.getElementById('pwa-install')?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                prompt.remove();
            }
            deferredPrompt = null;
        } else if (isAndroid()) {
            prompt.innerHTML = `
                <div class="max-w-lg mx-auto text-center py-2">
                    <p class="text-sm text-white/70">Tap the browser menu <span class="font-semibold text-white">⋮</span> and select <span class="font-semibold text-white">"Add to Home Screen"</span></p>
                    <button id="pwa-got-it" class="mt-3 px-4 py-2 text-xs text-white/50 hover:text-white font-medium">Got it</button>
                </div>
            `;
            document.getElementById('pwa-got-it')?.addEventListener('click', () => prompt.remove());
        }
    });
};

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    if (!sessionStorage.getItem('pwa-dismissed')) {
        showInstallPrompt();
    }
});

if (!isStandalone() && isMobile() && !sessionStorage.getItem('pwa-dismissed')) {
    setTimeout(() => {
        showInstallPrompt();
    }, 2000);
}

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
                console.log('ZuriBills is ready to work offline.');
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

const hidePreloader = () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.remove(), 300);
    }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);

hidePreloader();
