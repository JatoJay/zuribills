import { createFileRoute } from '@tanstack/react-router'
import Invoices from '@/pages/admin/Invoices'

export const Route = createFileRoute('/org/$slug/invoices/')({
    component: Invoices,
})
