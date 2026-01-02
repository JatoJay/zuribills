import { createFileRoute } from '@tanstack/react-router'
import Businesses from '@/pages/admin/Businesses'

export const Route = createFileRoute('/org/$slug/businesses')({
    component: Businesses,
})
