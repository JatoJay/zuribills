import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/help')({
    component: lazyRouteComponent(() => import('@/pages/admin/Help')),
})
