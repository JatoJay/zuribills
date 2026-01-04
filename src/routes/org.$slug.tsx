import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/org/$slug')({
    component: lazyRouteComponent(() => import('@/pages/admin/AdminLayout')),
})
