import { createFileRoute } from '@tanstack/react-router'
import Team from '@/pages/admin/Team'

export const Route = createFileRoute('/org/$slug/team')({
    component: Team,
})
