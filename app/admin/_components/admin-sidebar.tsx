'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { 
  ArrowLeft, 
  ClipboardList, 
  Hammer,
  HardDrive, 
  LogOut, 
  Megaphone, 
  Menu,
  Package, 
  Palette, 
  Sparkles,
  User,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface AdminSidebarProps {
  email: string
}

export function AdminSidebar({ email }: AdminSidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: '/admin/products', label: 'Products', icon: Package },
    // { href: '/admin/colors', label: 'Colors', icon: Palette },
    { href: '/admin/order-requests', label: 'Pre-Orders', icon: ClipboardList },
    { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { href: '/admin/production', label: 'Production', icon: Hammer },
    { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
    { href: '/admin/media', label: 'Media', icon: HardDrive },
    { href: '/admin/ai-studio', label: 'AI Studio', icon: Sparkles },
  ]

  const utilItems = [
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className="px-6 py-8">
        {/* <Link 
          href="/" 
          className="group mb-6 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Ver Loja
        </Link> */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão</h1>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Admin Dashboard</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm' 
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <Separator className="my-3" />

        <nav className="space-y-1">
          {utilItems.map(item => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm' 
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="mt-auto border-t border-border/50 bg-secondary/10 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/50 p-3 shadow-sm transition-colors hover:border-border">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/5 text-primary">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground" title={email}>
              {email.split('@')[0]}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {email}
            </p>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={() => db.auth.signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setIsOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-bold tracking-tight">Gestão</span>
        </div>
        <div className="flex items-center gap-2">
           <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-primary/5 text-xs text-primary uppercase">
              {email[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block border-r border-border bg-background/50 backdrop-blur-sm sticky top-0 h-screen w-[260px] overflow-hidden">
        <SidebarContent onNavigate={undefined} />
      </aside>
    </>
  )
}
