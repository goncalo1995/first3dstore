'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { MarketingHub } from '@/components/marketing/MarketingHub'
import type { CatalogRecord } from '@/app/admin/types'
import type { MarketingPost, StoryCategory } from '@/types/marketing'

export default function AdminMarketingPage() {
  const query = db.useQuery({
    catalogProducts: {},
    marketingPosts: {},
    storyCategories: {},
  })

  const products = useMemo(
    () => (query.data?.catalogProducts ?? []) as CatalogRecord[],
    [query.data?.catalogProducts],
  )
  const posts = useMemo(
    () => (query.data?.marketingPosts ?? []) as MarketingPost[],
    [query.data?.marketingPosts],
  )
  const storyCategories = useMemo(
    () => (query.data?.storyCategories ?? []) as StoryCategory[],
    [query.data?.storyCategories],
  )

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return <MarketingHub products={products} posts={posts} storyCategories={storyCategories} />
}
