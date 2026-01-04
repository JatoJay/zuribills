import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/org/$slug/reports')({
  component: lazyRouteComponent(() => import('@/pages/admin/Reports')),
});
