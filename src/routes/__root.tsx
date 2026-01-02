import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '@/context/ThemeContext'
import { TranslationProvider } from '@/context/TranslationContext'

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider>
            <TranslationProvider>
                <Outlet />
                <TanStackRouterDevtools />
            </TranslationProvider>
        </ThemeProvider>
    ),
})
