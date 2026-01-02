<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This repo now uses the fresh-app UI as the default app.

View your app in AI Studio: https://ai.studio/apps/drive/1Jt6Nh3gLLHwqtQcpjRV-GEO85-hVRFV5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. (Optional) Set API keys in `.env.local`:
   - `VITE_GEMINI_API_KEY` (or `VITE_API_KEY`) for Gemini features
   - `VITE_FLUTTERWAVE_PUBLIC_KEY` for Flutterwave payments
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Supabase storage (apply `supabase/schema.sql` in your project)
   - Note: the demo assumes public table access; enable RLS + policies for production.
3. (Optional) If using Flutterwave payments + webhooks, set server env vars in `.env.local` and run the server:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_SECRET`
   - `PLATFORM_FEE_PERCENT` (defaults to 1.5)
   - Required for Flutterwave bank payout connection and webhooks
   - Run `npm run server`
4. Run the app:
   `npm run dev`
