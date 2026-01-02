import { createFileRoute } from '@tanstack/react-router'
import CatalogLayout from '@/pages/public/CatalogLayout'

export const Route = createFileRoute('/catalog/$slug')({
    component: CatalogLayout,
})
