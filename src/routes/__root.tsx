import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '@/context/ThemeContext'
import { TranslationProvider } from '@/context/TranslationContext'
import { PromptProvider } from '@/context/PromptContext'

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider>
            <TranslationProvider>
                <PromptProvider>
                    <Outlet />
                    <TanStackRouterDevtools />
                </PromptProvider>
            </TranslationProvider>
        </ThemeProvider>
    ),
})
