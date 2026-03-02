import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/disclaimer')({
  component: lazyRouteComponent(() => import('@/pages/legal/Disclaimer')),
});
