import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'

export const Route = createFileRoute('/catalog/$slug/checkout')({
    component: lazyRouteComponent(() => import('@/pages/public/Checkout')),
})
