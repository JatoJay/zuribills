import { createFileRoute } from '@tanstack/react-router'
import InvoiceView from '@/pages/public/InvoiceView'

export const Route = createFileRoute('/catalog/$slug/invoice/$invoiceId')({
    component: InvoiceView,
})
