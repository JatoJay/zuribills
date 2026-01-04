import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/catalog/$slug/invoice/$invoiceId')({
    component: lazyRouteComponent(() => import('@/pages/public/InvoiceView')),
})
