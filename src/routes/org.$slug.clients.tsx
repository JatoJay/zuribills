import { createFileRoute } from '@tanstack/react-router'
import Clients from '@/pages/admin/Clients'

export const Route = createFileRoute('/org/$slug/clients')({
    component: Clients,
})
