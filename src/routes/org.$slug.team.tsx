import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/team')({
    component: lazyRouteComponent(() => import('@/pages/admin/Team')),
})
