import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/catalog/$slug/')({
    component: lazyRouteComponent(() => import('@/pages/public/Catalog')),
})
