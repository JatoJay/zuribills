import { createFileRoute } from '@tanstack/react-router'
import Services from '@/pages/admin/Services'

export const Route = createFileRoute('/org/$slug/services')({
    component: Services,
})
