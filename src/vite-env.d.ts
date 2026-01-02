/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY: string
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_STRIPE_PUBLIC_KEY: string
    readonly VITE_PAYSTACK_PUBLIC_KEY: string
    readonly VITE_FLUTTERWAVE_PUBLIC_KEY: string
    readonly VITE_APP_BASE_URL: string
    readonly VITE_GOOGLE_CLIENT_ID: string
    readonly VITE_TRIAL_DAYS: string
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
