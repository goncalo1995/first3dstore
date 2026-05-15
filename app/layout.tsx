import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { CartDrawer } from '@/components/cart-drawer'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'EM3D · Objetos úteis, impressão 3D em Portugal',
  description: 'Objetos úteis, personalizados e impressos em 3D em Portugal. Peças para casa, secretária, presentes e empresas.',
  keywords: ['impressão 3D', 'objetos personalizados', 'presentes personalizados', 'produção local', 'Portugal', 'EM3D'],
  openGraph: {
    title: 'EM3D · Objetos úteis, impressão 3D em Portugal',
    description: 'Objetos úteis, personalizados e impressos em 3D em Portugal.',
    type: 'website',
    locale: 'pt_PT',
  },
  metadataBase: new URL('https://em3d.pt'),
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
