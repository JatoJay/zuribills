# Ogasir
One canvas for services, expenses, pricing, checkout, and follow-ups. 
Take full control of your business with Ogasir; share a beautiful catalog, get paid faster, and file taxes with clean inflow/outflow reports.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Set API keys in `.env.local`:
   - `VITE_GEMINI_API_KEY` (or `VITE_API_KEY`) for Gemini features
   - `VITE_FLUTTERWAVE_PUBLIC_KEY` for Flutterwave payments
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Supabase storage (apply `supabase/schema.sql` in your project)
   - Note: the demo assumes public table access; enable RLS + policies for production.
3. (Optional) If using Flutterwave payments + webhooks, set server env vars in `.env.local` and run the NestJS API (lives in `backend/`, serves `/api/*` on port 8787):
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_SECRET`
   - `PLATFORM_FEE_PERCENT` (defaults to 0.7)
   - Required for Flutterwave bank payout connection and webhooks
   - Run `npm run server`
4. (Optional) If using MTN MoMo payments:
   - `MOMO_API_BASE_URL` (defaults to `https://sandbox.momodeveloper.mtn.com`)
   - `MOMO_TARGET_ENVIRONMENT` (defaults to `sandbox`)
   - `MOMO_COLLECTION_SUBSCRIPTION_KEY`
   - `MOMO_COLLECTION_USER_ID`
   - `MOMO_COLLECTION_API_KEY`
   - (Optional, for automatic payouts) `MOMO_DISBURSEMENT_SUBSCRIPTION_KEY`
   - (Optional, for automatic payouts) `MOMO_DISBURSEMENT_USER_ID`
   - (Optional, for automatic payouts) `MOMO_DISBURSEMENT_API_KEY`
4. Run the app:
   `npm run dev`
