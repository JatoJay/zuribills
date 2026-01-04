import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/org/$slug/expenses')({
  component: lazyRouteComponent(() => import('@/pages/admin/Expenses')),
});
