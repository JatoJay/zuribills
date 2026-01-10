import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/payouts')({
    component: lazyRouteComponent(() => import('@/pages/admin/Payouts')),
})
