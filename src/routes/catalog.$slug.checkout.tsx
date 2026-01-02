import { createFileRoute } from '@tanstack/react-router'
import Checkout from '@/pages/public/Checkout'

export const Route = createFileRoute('/catalog/$slug/checkout')({
    component: Checkout,
})
