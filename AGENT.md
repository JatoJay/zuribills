# AGENT.md - InvoiceFlow (Ogasir) Development Guide

## Project Overview

**InvoiceFlow (Ogasir)** is a comprehensive invoicing and business management platform. It provides organizations with tools for managing services, clients, invoices, expenses, and financial reports. The platform includes a public-facing catalog for customer checkout and an AI-powered assistant for business analytics.

### Core Features
- Multi-organization support with team management
- Invoice creation, tracking, and ownership transfer (lineage)
- Expense tracking and categorization
- Public service catalog with online checkout
- Payment processing (Flutterwave, Stripe, MTN MoMo via Afnex)
- Cash flow reports and analytics
- AI-powered features (invoice parsing, email generation, compliance checking)
- Multi-language support with location-based auto-detection
- Offline-first PWA support

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **TanStack Router** - File-based routing with type-safe navigation
- **Vite** - Build tool and dev server
- **Tailwind CSS** (via custom CSS variables in `index.css`)
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Recharts** - Data visualization

### Backend
- **NestJS** - API server (lives in `/backend`)
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **Resend** - Email delivery
- **Google Gemini** - AI features
- **class-validator** - Request validation with decorators
- **class-transformer** - DTO transformation

### Payment Provider
- **Polar.sh** - Primary payment gateway for all countries
  - Handles checkout sessions and payment processing
  - All payments flow through a single ZuriBills Polar account
  - Merchants do NOT need their own Polar accounts
  - Merchant bank details are collected for manual/automated payouts
  - Webhook endpoint: `/api/payments/polar/webhook`

---

## Project Structure

```
/
├── src/                      # Frontend source
│   ├── components/           # Reusable UI components
│   │   └── ui.tsx           # Core UI primitives (Button, Input, Card, Modal, etc.)
│   ├── context/             # React context providers
│   │   ├── CartContext.tsx  # Shopping cart state
│   │   ├── PromptContext.tsx # AI prompt modal
│   │   ├── ThemeContext.tsx # Dark/light theme
│   │   └── TranslationContext.tsx # i18n with Gemini translation
│   ├── constants/
│   │   └── languages.ts     # Supported languages list
│   ├── hooks/
│   │   └── useTranslation.ts # Translation hook
│   ├── pages/               # Page components
│   │   ├── admin/           # Protected admin pages
│   │   │   ├── AdminLayout.tsx # Sidebar, org context
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Invoices.tsx
│   │   │   ├── InvoiceCreate.tsx
│   │   │   ├── Expenses.tsx
│   │   │   ├── Clients.tsx
│   │   │   ├── Services.tsx
│   │   │   ├── Team.tsx
│   │   │   ├── Businesses.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Payouts.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Help.tsx
│   │   ├── public/          # Public-facing pages
│   │   │   ├── CatalogLayout.tsx
│   │   │   ├── Catalog.tsx
│   │   │   ├── Checkout.tsx
│   │   │   ├── InvoiceView.tsx
│   │   │   └── Success.tsx
│   │   ├── Landing.tsx      # Marketing homepage
│   │   ├── Login.tsx        # Auth page (Supabase Auth)
│   │   └── Onboarding.tsx   # New user/org setup
│   ├── routes/              # TanStack Router route definitions
│   ├── services/            # Business logic and API clients
│   │   ├── storage.ts       # Supabase CRUD operations (main data layer)
│   │   ├── supabaseClient.ts # Supabase client singleton
│   │   ├── geminiService.ts # AI features (translate, parse, analyze)
│   │   ├── paymentService.ts # Payment gateway integration
│   │   ├── paymentRouting.ts # Currency-to-provider mapping
│   │   ├── geolocation.ts   # IP-based location detection
│   │   ├── reports.ts       # Cash flow report generation
│   │   ├── email.ts         # Email composition
│   │   ├── aiAgent.ts       # Business analyst chat
│   │   └── apiClient.ts     # Backend API fetch wrapper
│   ├── types.ts             # TypeScript interfaces and enums
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles and CSS variables
├── backend/                 # NestJS API server
│   └── src/
│       ├── main.ts          # Server bootstrap with ValidationPipe
│       ├── app.module.ts    # NestJS module
│       ├── app.controller.ts # All API endpoints
│       └── dto/
│           └── index.ts     # DTO classes with class-validator decorators
├── supabase/
│   └── schema.sql           # Database schema with RLS policies
├── public/                  # Static assets
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Database Schema

The database uses **Supabase (PostgreSQL)** with Row Level Security. Key tables:

| Table | Purpose |
|-------|---------|
| `accounts` | Top-level billing account (owns organizations) |
| `users` | User profiles with roles and permissions |
| `organizations` | Business entities with settings, branding, payment config |
| `org_memberships` | User-to-organization mapping with roles |
| `services` | Catalog items/services offered |
| `clients` | Customer records |
| `invoices` | Invoice documents with line items |
| `invoice_transfers` | Audit trail for invoice ownership changes |
| `expenses` | Expense records |
| `payments` | Payment transactions |
| `agent_logs` | AI agent activity logs |

### Key Relationships
- `Account` → has many `Users` and `Organizations`
- `Organization` → has many `Services`, `Clients`, `Invoices`, `Expenses`
- `User` → belongs to `Account`, has many `OrgMemberships`
- `Invoice` → may have `parentInvoiceId` and `rootInvoiceId` for lineage tracking

### Row Level Security
All tables have RLS enabled. Policies use helper functions:
- `current_user_id()` - Get authenticated user's ID
- `current_account_id()` - Get user's account ID
- `is_org_member(org_id)` - Check organization membership
- `is_org_admin(org_id)` - Check admin role
- `is_catalog_org(org_id)` - Check if catalog is public

---

## Routing

Uses **TanStack Router** with file-based routing in `/src/routes/`.

### Route Patterns
- `/` - Landing page
- `/login` - Authentication
- `/onboarding` - New user setup
- `/org/$slug/*` - Admin dashboard (protected)
  - `/org/$slug` - Dashboard
  - `/org/$slug/invoices` - Invoice list
  - `/org/$slug/invoices/create` - Create invoice
  - `/org/$slug/expenses` - Expenses
  - `/org/$slug/clients` - Client management
  - `/org/$slug/services` - Service catalog
  - `/org/$slug/team` - Team management
  - `/org/$slug/businesses` - Multi-org management
  - `/org/$slug/settings` - Organization settings
  - `/org/$slug/payouts` - Payout configuration
  - `/org/$slug/reports` - Financial reports
  - `/org/$slug/help` - Help & support
- `/catalog/$slug/*` - Public catalog (customer-facing)
  - `/catalog/$slug` - Browse services
  - `/catalog/$slug/checkout` - Cart checkout
  - `/catalog/$slug/invoice/$invoiceId` - View invoice
  - `/catalog/$slug/success/$invoiceId` - Payment success

---

## Core Services

### `storage.ts` - Data Layer
Primary interface to Supabase. Handles all CRUD operations:
- User/Account management
- Organization CRUD
- Services, Clients, Invoices, Expenses
- Invoice ownership transfer with lineage tracking
- Offline caching with localStorage fallback
- Legacy localStorage migration

### `geminiService.ts` - AI Features
- `translateBatch()` - Multi-language translation via backend
- `generateServiceDescription()` - AI-generated service descriptions
- `parseInvoicePrompt()` - Natural language to invoice parsing
- `generateInvoiceEmailBody()` - Smart email composition
- `askBusinessAnalyst()` - Business analytics chat
- `validateInvoiceCompliance()` - Invoice compliance checking

### `paymentService.ts` - Payments
- `initAfnexPayment()` - Initialize payment via Afnex gateway
- `fetchFlutterwaveBanks()` - Get bank list for payouts
- `createFlutterwavePayoutAccount()` - Connect payout account
- `fetchProviderRate()` - Currency exchange rates

### `geolocation.ts` - Location Detection
- `detectLocationLanguage()` - IP-based country/language detection
- `getLanguageForCountry()` - Country code to language mapping

---

## Backend API

The NestJS backend (`/backend`) exposes REST endpoints under `/api`.

### Request Validation

All POST endpoints use **class-validator** DTOs for schema validation:

```typescript
// Example DTO from backend/src/dto/index.ts
export class SendInvoiceEmailDto {
    @IsEmail({}, { message: 'Recipient email must be a valid email address' })
    @IsNotEmpty({ message: 'Recipient email is required' })
    to: string;

    @IsString()
    @IsOptional()
    subject?: string;
}
```

The global `ValidationPipe` in `main.ts` automatically:
- Validates incoming requests against DTOs
- Returns 400 errors with descriptive messages for invalid input
- Strips unknown properties (`whitelist: true`)
- Rejects requests with extra properties (`forbidNonWhitelisted: true`)

### Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback

### AI
- `POST /api/ai/generate` - Gemini content generation
- `POST /api/translate` - Text translation (Google Translate or Gemini)

### Payments
- `GET /api/checkout/init` - Initialize Polar checkout (data passed via X-Data header)
- `POST /api/payments/polar/webhook` - Polar webhook handler (order.paid, checkout.updated, order.refunded)

### Email
- `POST /api/email/send` - Send transactional email via Resend

### Subscriptions
- `POST /api/subscriptions/start` - Start subscription checkout
- `POST /api/webhooks/subscription` - Subscription webhook

---

## Environment Variables

### Frontend (`.env` or `.env.local`)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIza...  # or VITE_API_KEY
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxx
VITE_APP_BASE_URL=http://localhost:3004
VITE_TRIAL_DAYS=7
```

### Backend
```bash
# Supabase (service role for backend)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_TRANSLATE_API_KEY=AIza...

# Email
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_REPLY_TO=support@yourdomain.com

# OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8787/api/auth/google/callback

# Payments (Polar.sh)
POLAR_ACCESS_TOKEN=polar_oat_xxx
POLAR_ORG_ID=xxx-xxx-xxx
POLAR_WEBHOOK_SECRET=polar_whs_xxx
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start frontend dev server (port 3004)
npm run dev

# Start backend API server (port 8787)
npm run server

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Key Patterns and Conventions

### TypeScript Interfaces
All data types are defined in `src/types.ts`. Use these interfaces consistently:
- `Organization`, `User`, `Account` - Core entities
- `Invoice`, `InvoiceItem`, `InvoiceStatus` - Invoice types
- `Expense`, `ExpenseItem`, `ExpenseStatus` - Expense types
- `Service`, `Client`, `Payment` - Supporting entities

### UI Components
Use components from `src/components/ui.tsx`:
- `Button` - Primary, secondary, outline, danger, ghost variants
- `Input` - Form input with label and error support
- `Select` - Dropdown select with options
- `Card` - Container with border and shadow
- `Modal` - Dialog overlay
- `Badge` - Status indicators
- `formatCurrency()` - Currency formatting utility

### Translation
Wrap translatable strings with the `t()` function from `useTranslation`:
```tsx
const { t } = useTranslation(['String 1', 'String 2']);
return <p>{t('String 1')}</p>;
```

### Admin Context
Admin pages have access to `useAdminContext()` which provides:
- `org` - Current organization
- `user` - Current user
- `refreshOrg()` - Reload organization data

### Offline Support
The app uses service workers (PWA) for offline support. Data operations in `storage.ts` include offline caching fallbacks.

---

## Testing

No test framework is currently configured. When adding tests:
1. Check `package.json` for existing test scripts
2. Consider Vitest (Vite-native) or Jest
3. Add unit tests for services, integration tests for API

---

## Deployment

### Frontend
- Build with `npm run build`
- Deploy `/dist` to any static host (Vercel, Netlify, Cloudflare Pages)

### Backend
- Build backend TypeScript: `tsc -p backend/tsconfig.json`
- Run: `node backend/dist/main.js`
- Deploy to any Node.js host (Railway, Render, Fly.io)
- Ensure environment variables are set

### Database
- Apply `supabase/schema.sql` to your Supabase project
- Enable RLS policies for production security

---

## Common Development Tasks

### Adding a New Admin Page
1. Create page component in `src/pages/admin/NewPage.tsx`
2. Create route file `src/routes/org.$slug.newpage.tsx`
3. Add navigation link in `AdminLayout.tsx`
4. Import from `pages/admin` in route file

### Adding a New Service Function
1. Add function to appropriate file in `src/services/`
2. Export and use in components
3. Handle errors and loading states

### Adding a New API Endpoint
1. Add handler method in `backend/src/app.controller.ts`
2. Use `@Get()`, `@Post()` decorators with route path
3. Access request with `@Req() req: Request`
4. Return response with `@Res() res: Response`

### Modifying Database Schema
1. Update `supabase/schema.sql`
2. Run migrations in Supabase dashboard or CLI
3. Update corresponding types in `src/types.ts`
4. Update mappers in `src/services/storage.ts`

---

## Security Considerations

- All Supabase tables use Row Level Security (RLS)
- Backend validates JWT tokens for protected endpoints
- Sensitive keys are never exposed to frontend
- Payment webhooks verify signatures
- CORS is enabled with origin validation
- User sessions can be revoked via security stamp rotation

---

## Payment & Payout Model

### How Payments Work
1. Customer clicks "Pay Now" on invoice
2. Frontend calls `/api/checkout/init` with invoice details (hex-encoded via X-Data header to bypass Vercel WAF)
3. Backend creates Polar checkout session and returns checkout URL
4. Customer completes payment on Polar's hosted checkout page
5. Polar sends webhook to `/api/payments/polar/webhook` on successful payment
6. Webhook updates invoice status to PAID and logs the payout

### Payout Flow
- **All payments go to ZuriBills' single Polar account**
- Merchants configure their bank details in Settings → Payouts
- Bank details stored: Country, Bank Name, Account Number, Account Holder Name, Routing Number
- Payouts to merchants are handled separately (manual or via integrated payout provider)
- Merchants do NOT need their own Polar accounts - reduces onboarding friction

### Payout Configuration (paymentConfig)
```typescript
paymentConfig: {
  enabled: boolean;          // Payments enabled for this org
  provider: 'polar';         // Always 'polar'
  bankCountry: string;       // e.g., 'NG', 'US', 'GB'
  bankName: string;          // e.g., 'Access Bank'
  accountName: string;       // Account holder name
  accountNumberLast4?: string; // Last 4 digits (for display)
  routingNumber?: string;    // Optional routing/sort code
  platformFeePercent: number; // ZuriBills fee (default 0.7%)
}
```

---

## AI Features Configuration

AI features require:
1. `GEMINI_API_KEY` for Gemini model access
2. Backend running to proxy AI requests
3. Translation can use Google Translate API or fall back to Gemini

To disable AI features, the frontend gracefully handles missing API keys with `AI_DISABLED_MESSAGE` fallback.
