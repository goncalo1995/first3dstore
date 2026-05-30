import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { CartDrawer } from '@/components/cart-drawer'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'em3D · Estúdio de impressão 3D em Portugal',
  description: 'Estúdio premium de impressão 3D em Portugal para sinalética modular, objetos personalizados e pequenas séries.',
  keywords: ['impressão 3D', 'sinalética modular', 'objetos personalizados', 'produção local', 'Portugal', 'em3D'],
  openGraph: {
    title: 'em3D · Estúdio de impressão 3D em Portugal',
    description: 'Sinalética modular, objetos personalizados e pequenas séries impressas em 3D em Portugal.',
    type: 'website',
    locale: 'pt_PT',
  },
  metadataBase: new URL('https://em3d.pt'),
}

export const viewport: Viewport = {
  themeColor: '#09090b',
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
