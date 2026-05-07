'use client'

import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { ColorManager } from '@/app/admin/_components/color-manager'
import type { ColorRecord } from '@/app/admin/types'

export default function AdminColorsPage() {
  const dataQuery = db.useQuery({
    globalColors: {},
  })

  if (dataQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const colors = (dataQuery.data?.globalColors ?? []) as ColorRecord[]

  return <ColorManager colors={colors} />
}
