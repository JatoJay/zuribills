import { createFileRoute } from '@tanstack/react-router'
import Catalog from '@/pages/public/Catalog'

export const Route = createFileRoute('/catalog/$slug/')({
    component: Catalog,
})
