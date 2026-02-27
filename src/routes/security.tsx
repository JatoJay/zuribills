import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/security')({
  component: lazyRouteComponent(() => import('@/pages/legal/Security')),
});
