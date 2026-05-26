'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type MobilePanel =
  | { type: 'closed' }
  | { type: 'structure' }
  | { type: 'column'; rowId: string; columnId: string }
  | { type: 'colors' }
  | { type: 'extras' }
  | { type: 'checkout' }
  | { type: 'walls' }

export function BottomInspector({
  open,
  title,
  subtitle,
  children,
  onClose,
  hideClose = false,
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  hideClose?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-[5.4rem] z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] xl:hidden">
      <div className="mx-auto max-h-[min(58dvh,520px)] max-w-2xl overflow-hidden rounded-t-[1.75rem] border border-stone-200 bg-white text-stone-950 shadow-[0_-24px_80px_rgba(0,0,0,0.36)]">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Editor</p>
            <h2 className="mt-1 text-lg font-black">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-5 text-stone-500">{subtitle}</p>}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:text-stone-950"
              aria-label="Fechar editor"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="max-h-[calc(min(58dvh,520px)-5.5rem)] overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export function MobileToolDock({
  onOpenPanel,
}: {
  onOpenPanel: (panel: MobilePanel) => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-[5.2rem] z-30 px-4 xl:hidden">
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-full border border-white/10 bg-[#111113]/88 p-1.5 text-white shadow-2xl backdrop-blur-xl">
        {([
          ['colors', 'Cores'],
          ['extras', 'Extras'],
          ['checkout', 'Dados'],
        ] as const).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => onOpenPanel({ type })}
            className="h-10 flex-1 cursor-pointer rounded-full px-3 text-xs font-black transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
