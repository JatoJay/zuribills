import { createFileRoute } from '@tanstack/react-router'
import Settings from '@/pages/admin/Settings'

export const Route = createFileRoute('/org/$slug/settings')({
    component: Settings,
})
