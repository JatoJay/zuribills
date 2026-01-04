import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/invoices/create')({
    component: lazyRouteComponent(() => import('@/pages/admin/InvoiceCreate')),
})
