'use client'

import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { AdminSidebar } from './_components/admin-sidebar'
import { LoginPanel } from './_components/login-panel'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = db.useAuth()

  if (auth.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  if (!auth.user) return <LoginPanel />
  
  return (
    <main className="min-h-screen bg-secondary lg:grid lg:grid-cols-[260px_1fr]">
      <AdminSidebar email={auth.user.email || 'loading...'} />
      
      <section className="space-y-5 px-4 py-6 sm:px-6 lg:px-8 pb-12">
        {children}
      </section>
      <Toaster richColors closeButton position="bottom-right" />
    </main>
  )
}
