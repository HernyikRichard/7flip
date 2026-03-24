import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import AuthProvider from '@/components/auth/AuthProvider'
import { ToastProvider } from '@/components/ui/Toaster'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import CookieConsent from '@/components/ui/CookieConsent'
import ServiceWorkerRegistration from '@/components/layout/ServiceWorkerRegistration'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '7flip',
  description: '7flip társasjáték tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '7flip',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Téma flash megelőzése: JS-ben azonnal beállítjuk a .dark osztályt */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            var d = document.documentElement;
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              d.classList.add('dark');
            } else if (t === 'light') {
              d.classList.add('light');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <CookieConsent />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
