import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/clients')({
    component: lazyRouteComponent(() => import('@/pages/admin/Clients')),
})
