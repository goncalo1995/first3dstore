'use client'

import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { ProductionHub } from '@/app/admin/_components/production-hub'

export default function AdminProductionPage() {
  const query = db.useQuery({ 
    productionJobs: { 
      order: {},
      globalColor: {},
      schedule: {},
      history: {},
    },
    orders: { 
      productionJobs: {} 
    },
    globalColors: {
      spools: {},
      slots: {},
    },
    spools: {
      color: {},
      slots: {},
    },
    printers: {
      slots: {
        spool: {},
        color: {},
      },
      history: {},
    },
    scheduledJobs: {
      job: {},
    },
    catalogProducts: {},
    printFarms: {},
  })

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <ProductionHub
      // jobs={(query.data?.productionJobs ?? []) as any[]}
      // orders={(query.data?.orders ?? []) as any[]}
      // allColors={(query.data?.globalColors ?? []) as any[]}
      // spools={(query.data?.spools ?? []) as any[]}
      // printers={(query.data?.printers ?? []) as any[]}
      // scheduledJobs={(query.data?.scheduledJobs ?? []) as any[]}
      // products={(query.data?.catalogProducts ?? []) as any[]}
      // printFarms={(query.data?.printFarms ?? []) as any[]}
    />
  )
}
