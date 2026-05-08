'use client'

import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { OrdersManager } from './orders-manager'
import type { OrderRecord } from '@/app/admin/types'

export default function AdminOrdersPage() {
  const dataQuery = db.useQuery({
    orders: {
      productionJobs: {},
    },
    orderRequests: {
      $: {
        order: { createdAt: 'desc' },
      },
    },
    productionJobs: {},
  })

  if (dataQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const orders = (dataQuery.data?.orders ?? []) as OrderRecord[]
  const orderRequests = (dataQuery.data?.orderRequests ?? []) as any[]
  const allProductionJobs = (dataQuery.data?.productionJobs ?? []) as any[]

  return <OrdersManager orders={orders} orderRequests={orderRequests} allProductionJobs={allProductionJobs} />
}
