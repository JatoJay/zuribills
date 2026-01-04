import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/invoices/')({
    component: lazyRouteComponent(() => import('@/pages/admin/Invoices')),
})
