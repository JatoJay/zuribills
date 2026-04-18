import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_BASE_URL = process.env.VITE_APP_BASE_URL || 'https://zuribills.com';

const ALLOWED_ORIGINS = new Set<string>([
    APP_BASE_URL,
    'https://zuribills.com',
    'https://www.zuribills.com',
]);

if (process.env.NODE_ENV !== 'production') {
    ALLOWED_ORIGINS.add('http://localhost:5173');
    ALLOWED_ORIGINS.add('http://localhost:3000');
}

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const CURRENCY_REGEX = /^[A-Z]{3}$/;
export const COUNTRY_REGEX = /^[A-Z]{2}$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NUMERIC_REGEX = /^\d{1,32}$/;

const HTML_ESCAPE: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
};

export function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>"'/]/g, (c) => HTML_ESCAPE[c] || c);
}

export function stripCRLF(value: unknown): string {
    return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

export function applyCors(req: VercelRequest, res: VercelResponse) {
    const origin = (req.headers.origin as string) || '';
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', APP_BASE_URL);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Data');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');
}

export function timingSafeStringEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

type AuthedUser = { id: string; email: string | null };

export async function verifySupabaseJwt(req: VercelRequest): Promise<AuthedUser | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token) return null;

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
            },
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data?.id) return null;
        return { id: data.id, email: data.email || null };
    } catch (err) {
        console.error('JWT verification failed');
        return null;
    }
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<AuthedUser | null> {
    const user = await verifySupabaseJwt(req);
    if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return null;
    }
    return user;
}

type Membership = { role: string; permissions: string[] };

export async function getOrgMembership(userId: string, orgId: string): Promise<Membership | null> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
    if (!UUID_REGEX.test(userId) && !ID_REGEX.test(userId)) return null;
    if (!ID_REGEX.test(orgId)) return null;

    try {
        const url = `${SUPABASE_URL}/rest/v1/org_memberships?user_id=eq.${encodeURIComponent(userId)}&organization_id=eq.${encodeURIComponent(orgId)}&select=role,permissions&limit=1`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return null;
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return { role: rows[0].role || 'MEMBER', permissions: rows[0].permissions || [] };
    } catch (err) {
        console.error('Membership lookup failed');
        return null;
    }
}

export async function requireOrgAdmin(
    req: VercelRequest,
    res: VercelResponse,
    orgId: string
): Promise<AuthedUser | null> {
    const user = await requireAuth(req, res);
    if (!user) return null;
    const membership = await getOrgMembership(user.id, orgId);
    if (!membership) {
        res.status(403).json({ error: 'Not authorized for this organization' });
        return null;
    }
    const role = (membership.role || '').toUpperCase();
    if (role !== 'OWNER' && role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin role required' });
        return null;
    }
    return user;
}

export async function getInvoiceById(invoiceId: string): Promise<{
    id: string;
    organization_id: string;
    total: number;
    currency?: string;
    status: string;
    invoice_number?: string;
    client_email?: string;
} | null> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
    if (!ID_REGEX.test(invoiceId)) return null;
    try {
        const url = `${SUPABASE_URL}/rest/v1/invoices?id=eq.${encodeURIComponent(invoiceId)}&select=id,organization_id,total,currency,status,invoice_number,client_email&limit=1`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return null;
        const rows = await response.json();
        return rows?.[0] || null;
    } catch (err) {
        console.error('Invoice lookup failed');
        return null;
    }
}

export async function getOrganizationById(orgId: string): Promise<{
    id: string;
    slug?: string;
    currency?: string;
    name?: string;
} | null> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
    if (!ID_REGEX.test(orgId)) return null;
    try {
        const url = `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(orgId)}&select=id,slug,currency,name&limit=1`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return null;
        const rows = await response.json();
        return rows?.[0] || null;
    } catch (err) {
        console.error('Organization lookup failed');
        return null;
    }
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_BUCKET_MAX_SIZE = 5000;
let rateLimitCalls = 0;

function pruneExpiredBuckets(now: number) {
    for (const [k, v] of rateBuckets) {
        if (v.resetAt < now) rateBuckets.delete(k);
    }
    if (rateBuckets.size > RATE_BUCKET_MAX_SIZE) {
        const overflow = rateBuckets.size - RATE_BUCKET_MAX_SIZE;
        let removed = 0;
        for (const k of rateBuckets.keys()) {
            rateBuckets.delete(k);
            if (++removed >= overflow) break;
        }
    }
}

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    if ((++rateLimitCalls & 0xff) === 0) pruneExpiredBuckets(now);
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: max - 1 };
    }
    bucket.count += 1;
    if (bucket.count > max) {
        return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: max - bucket.count };
}

export function getClientIp(req: VercelRequest): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
    if (Array.isArray(xff) && xff.length) return xff[0].split(',')[0].trim();
    return (req.socket?.remoteAddress as string) || 'unknown';
}

export function checkRateLimit(
    req: VercelRequest,
    res: VercelResponse,
    bucket: string,
    max: number,
    windowMs: number,
    keySuffix?: string
): boolean {
    const ip = getClientIp(req);
    const key = `${bucket}:${ip}:${keySuffix || ''}`;
    const result = rateLimit(key, max, windowMs);
    if (!result.allowed) {
        res.status(429).json({ error: 'Too many requests' });
        return false;
    }
    return true;
}

export function isValidUrl(value: string, allowedHosts: string[]): boolean {
    try {
        const url = new URL(value);
        return allowedHosts.includes(url.host);
    } catch {
        return false;
    }
}
