import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/settings')({
    component: lazyRouteComponent(() => import('@/pages/admin/Settings')),
})
