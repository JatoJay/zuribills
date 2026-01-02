import { createFileRoute } from '@tanstack/react-router'
import Success from '@/pages/public/Success'

export const Route = createFileRoute('/catalog/$slug/success/$invoiceId')({
    component: Success,
})
