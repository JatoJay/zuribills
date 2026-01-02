import { createFileRoute } from '@tanstack/react-router'
import InvoiceCreate from '@/pages/admin/InvoiceCreate'

export const Route = createFileRoute('/org/$slug/invoices/create')({
    component: InvoiceCreate,
})
