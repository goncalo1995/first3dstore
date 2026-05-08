import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { CartDrawer } from '@/components/cart-drawer'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'foto3d.pt | Luz de Memória',
  description: 'Transforme uma fotografia especial numa luz 3D personalizada, feita à mão em Lisboa.',
  keywords: ['foto 3D', 'luz personalizada', 'lithophane', 'presente personalizado', 'Lisboa', 'Portugal'],
  openGraph: {
    title: 'foto3d.pt | Luz de Memória',
    description: 'Transforme uma fotografia especial numa luz 3D personalizada, feita à mão em Lisboa.',
    type: 'website',
    locale: 'pt_PT',
  },
  metadataBase: new URL('https://foto3d.pt'),
}

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt" className="bg-background" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
        <Toaster richColors closeButton position="bottom-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
