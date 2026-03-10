import { createRootRoute, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '@/context/ThemeContext'
import { TranslationProvider } from '@/context/TranslationContext'
import { PromptProvider } from '@/context/PromptContext'

const TanStackRouterDevtools = import.meta.env.DEV
    ? lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
            default: res.TanStackRouterDevtools,
        }))
    )
    : () => null

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider>
            <TranslationProvider>
                <PromptProvider>
                    <Outlet />
                    <Analytics />
                    {import.meta.env.DEV && (
                        <Suspense>
                            <div className="print:hidden">
                                <TanStackRouterDevtools />
                            </div>
                        </Suspense>
                    )}
                </PromptProvider>
            </TranslationProvider>
        </ThemeProvider>
    ),
})
