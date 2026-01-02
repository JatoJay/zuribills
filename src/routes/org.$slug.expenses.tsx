import { createFileRoute } from '@tanstack/react-router';
import Expenses from '@/pages/admin/Expenses';

export const Route = createFileRoute('/org/$slug/expenses')({
  component: Expenses,
});
