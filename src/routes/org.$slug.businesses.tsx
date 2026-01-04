import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug/businesses')({
    component: lazyRouteComponent(() => import('@/pages/admin/Businesses')),
})
