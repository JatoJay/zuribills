import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/catalog/$slug/success/$invoiceId')({
    component: lazyRouteComponent(() => import('@/pages/public/Success')),
})
