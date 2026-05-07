import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { CartDrawer } from '@/components/cart-drawer'
import './globals.css'

export const metadata: Metadata = {
  title: 'GolfPrint.pt | Custom 3D-Printed Golf Accessories',
  description: 'Small-batch 3D-printed golf accessories made in Lisbon. Ready-stock and personalised options for golfers.',
  keywords: ['golf accessories', 'custom golf gifts', '3D printed', 'Lisbon', 'Portugal', 'personalised golf'],
  openGraph: {
    title: 'GolfPrint.pt | Custom 3D-Printed Golf Accessories',
    description: 'Small-batch 3D-printed golf accessories made in Lisbon. Ready-stock and personalised options for golfers.',
    type: 'website',
    locale: 'en_GB',
  },
  metadataBase: new URL('https://golfprint.pt'),
}

export const viewport: Viewport = {
  themeColor: '#1B6B45',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
