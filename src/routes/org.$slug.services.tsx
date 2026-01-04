import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/services')({
    component: lazyRouteComponent(() => import('@/pages/admin/Services')),
})
