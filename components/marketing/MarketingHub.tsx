'use client'

import { useMemo, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import {
  ChevronDown,
  Copy,
  CopyPlus,
  Edit3,
  Grid3X3,
  ImageIcon,
  Images,
  Instagram,
  LayoutList,
  Loader2,
  Mail,
  MoreHorizontal,
  Move,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Wand2,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { db, id } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaPicker } from './MediaPicker'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import type { CatalogRecord } from '@/app/admin/types'
import type {
  MarketingContentType,
  MarketingCrop,
  MarketingCropContext,
  MarketingPost,
  MarketingPostStatus,
  MarketingSlideCrop,
  StoryCategory,
} from '@/types/marketing'

type PlannerView = 'list' | 'preview'
type DraftKind = MarketingContentType

type DraftPost = {
  id?: string
  contentType: MarketingContentType
  status: MarketingPostStatus
  title: string
  caption: string
  hashtagsText: string
  callToAction: string
  firstComment: string
  storyHighlightCategory: string
  mediaUrls: string[]
  productIds: string[]
  isCarousel: boolean
  slideCrops: MarketingSlideCrop[]
  scheduledAt: string
  timezone: string
  reminderOffsetHours: string
  reminderSent: boolean
  postedAt: string
}

type FrameDraft = {
  slideIndex: number
  context: MarketingCropContext
  crop: Required<MarketingCrop>
  slideCrop: MarketingSlideCrop
}

const statuses: MarketingPostStatus[] = ['draft', 'scheduled', 'published', 'archived']
const contentTypes: MarketingContentType[] = ['post', 'story', 'reel']
const cropContexts: MarketingCropContext[] = ['profile', 'feed', 'story']

const statusLabels: Record<MarketingPostStatus | 'all', string> = {
  all: 'All Media',
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
}

const contentTypeLabels: Record<MarketingContentType, string> = {
  post: 'Post',
  story: 'Story',
  reel: 'Reel',
}

const cropContextLabels: Record<MarketingCropContext, string> = {
  profile: 'Profile grid',
  feed: 'Feed post',
  story: 'Story',
}

const cropAspectClass: Record<MarketingCropContext, string> = {
  profile: 'aspect-[3/4]',
  feed: 'aspect-[4/5]',
  story: 'aspect-[9/16]',
}

function defaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon'
  } catch {
    return 'Europe/Lisbon'
  }
}

function toDatetimeInput(value?: Date | string) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function parseList(value: string) {
  return value
    .split(/[\n, ]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function formatHashtags(value: string) {
  return parseList(value)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
}

function formatPostText(post: Pick<MarketingPost, 'caption' | 'hashtags' | 'callToAction' | 'firstComment'>) {
  return [
    post.caption,
    post.callToAction,
    post.hashtags?.join(' '),
    post.firstComment ? `First comment:\n${post.firstComment}` : '',
  ].filter(Boolean).join('\n\n')
}

function normalizeCrop(crop?: MarketingCrop): Required<MarketingCrop> {
  return {
    x: crop?.x ?? 0,
    y: crop?.y ?? 0,
    zoom: crop?.zoom ?? 1,
  }
}

function getSlideCrop(
  slideCrops: MarketingSlideCrop[] | undefined,
  slideIndex: number,
  context: MarketingCropContext,
  fallback?: MarketingPost['thumbnailCrop'],
) {
  const crop = slideCrops?.find(item => item.slideIndex === slideIndex)?.[context]
  if (crop) return crop
  if (slideIndex === (fallback?.slideIndex ?? 0)) return fallback
  return undefined
}

function setSlideCrop(
  slideCrops: MarketingSlideCrop[],
  slideIndex: number,
  context: MarketingCropContext,
  crop: MarketingCrop,
) {
  const next = [...slideCrops]
  const existingIndex = next.findIndex(item => item.slideIndex === slideIndex)
  const existing = existingIndex >= 0 ? next[existingIndex] : { slideIndex }
  const updated = { ...existing, [context]: crop }

  if (existingIndex >= 0) next[existingIndex] = updated
  else next.push(updated)

  return next.sort((left, right) => left.slideIndex - right.slideIndex)
}

function commitFrameCrop(frame: FrameDraft) {
  return setSlideCrop([frame.slideCrop], frame.slideIndex, frame.context, frame.crop)[0]
}

function getPreviewUrl(mediaUrls: string[], slideIndex: number) {
  return mediaUrls[Math.min(Math.max(0, slideIndex), Math.max(0, mediaUrls.length - 1))] ?? ''
}

function InstagramFrame({
  mediaUrls,
  slideIndex = 0,
  crop,
  alt,
  aspect = 'profile',
  className = '',
  children,
}: {
  mediaUrls: string[]
  slideIndex?: number
  crop?: MarketingCrop
  alt: string
  aspect?: MarketingCropContext
  className?: string
  children?: ReactNode
}) {
  const url = getPreviewUrl(mediaUrls, slideIndex)
  const normalized = normalizeCrop(crop)

  return (
    <div className={`relative overflow-hidden bg-secondary ${cropAspectClass[aspect]} ${className}`}>
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          unoptimized
          className="object-cover"
          style={{
            transform: `translate(${normalized.x}%, ${normalized.y}%) scale(${normalized.zoom})`,
            transformOrigin: 'center',
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      {children}
    </div>
  )
}

function createDraft(contentType: MarketingContentType): DraftPost {
  return {
    contentType,
    status: 'draft',
    title: '',
    caption: '',
    hashtagsText: '',
    callToAction: contentType === 'story' ? '' : 'Link in bio',
    firstComment: '',
    storyHighlightCategory: '',
    mediaUrls: [''],
    productIds: [],
    isCarousel: false,
    slideCrops: [],
    scheduledAt: '',
    timezone: defaultTimezone(),
    reminderOffsetHours: '1',
    reminderSent: false,
    postedAt: '',
  }
}

function draftFromPost(post: MarketingPost): DraftPost {
  const isLegacyCarousel = (post.contentType as string) === 'carousel'
  const contentType = isLegacyCarousel ? 'post' : post.contentType

  return {
    id: post.id,
    contentType,
    status: post.status,
    title: post.title,
    caption: post.caption,
    hashtagsText: post.hashtags.join(' '),
    callToAction: post.callToAction ?? '',
    firstComment: post.firstComment ?? '',
    storyHighlightCategory: post.storyHighlightCategory ?? '',
    mediaUrls: post.mediaUrls.length ? post.mediaUrls : [''],
    productIds: post.productIds ?? [],
    isCarousel: Boolean(post.isCarousel || isLegacyCarousel),
    slideCrops: post.slideCrops ?? [],
    scheduledAt: toDatetimeInput(post.scheduledAt),
    timezone: post.timezone || defaultTimezone(),
    reminderOffsetHours: String(post.reminderOffsetHours ?? 1),
    reminderSent: Boolean(post.reminderSent),
    postedAt: toDatetimeInput(post.postedAt),
  }
}

function cleanMediaUrls(draft: DraftPost) {
  const urls = draft.mediaUrls.map(url => (url || '').trim()).filter(Boolean)
  if (draft.contentType === 'story' || draft.contentType === 'reel') return urls.slice(0, 1)
  return draft.isCarousel ? urls.slice(0, 20) : urls.slice(0, 1)
}

function draftToPayload(draft: DraftPost, userId: string) {
  const mediaUrls = cleanMediaUrls(draft)

  return {
    platform: 'instagram' as const,
    contentType: draft.contentType,
    status: draft.status,
    userId,
    title: draft.title.trim() || `Untitled ${contentTypeLabels[draft.contentType]}`,
    caption: draft.caption.trim(),
    hashtags: formatHashtags(draft.hashtagsText),
    callToAction: draft.callToAction.trim() || undefined,
    firstComment: draft.contentType === 'story' ? undefined : draft.firstComment.trim() || undefined,
    storyHighlightCategory: draft.contentType === 'story' ? draft.storyHighlightCategory.trim() || undefined : undefined,
    mediaUrls,
    productIds: draft.productIds,
    isCarousel: draft.contentType === 'post' && draft.isCarousel,
    slideCrops: draft.slideCrops.length ? draft.slideCrops.filter(crop => crop.slideIndex < mediaUrls.length) : undefined,
    scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt) : undefined,
    timezone: draft.timezone.trim() || defaultTimezone(),
    reminderOffsetHours: Math.max(0, Number(draft.reminderOffsetHours) || 1),
    reminderSent: draft.reminderSent,
    postedAt: draft.postedAt ? new Date(draft.postedAt) : undefined,
    metrics: undefined,
    updatedAt: new Date(),
  }
}

function getTaggedProducts(post: Pick<MarketingPost, 'productIds'>, products: CatalogRecord[]) {
  return (post.productIds ?? [])
    .map(productId => products.find(product => product.id === productId))
    .filter((product): product is CatalogRecord => Boolean(product))
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function ProductPicker({
  products,
  selectedIds,
  onChange,
}: {
  products: CatalogRecord[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const selectedProducts = selectedIds
    .map(productId => products.find(product => product.id === productId))
    .filter((product): product is CatalogRecord => Boolean(product))

  const toggleProduct = (productId: string) => {
    onChange(selectedIds.includes(productId)
      ? selectedIds.filter(id => id !== productId)
      : [...selectedIds, productId])
  }

  return (
    <div className="space-y-3">
      <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
        {products.map(product => (
          <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary">
            <Checkbox checked={selectedIds.includes(product.id)} onCheckedChange={() => toggleProduct(product.id)} />
            <span className="min-w-0 flex-1 truncate">{product.name}</span>
          </label>
        ))}
      </div>
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map(product => (
            <Badge key={product.id} variant="secondary">{product.name}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketingHub({
  products,
  posts,
  storyCategories,
}: {
  products: CatalogRecord[]
  posts: MarketingPost[]
  storyCategories: StoryCategory[]
}) {
  const auth = db.useAuth()
  const [statusFilter, setStatusFilter] = useState<MarketingPostStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MarketingContentType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<PlannerView>('list')
  const [draft, setDraft] = useState<DraftPost | null>(null)
  const [frameDraft, setFrameDraft] = useState<FrameDraft | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: Required<MarketingCrop> } | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<number | null>(null)
  const [remixPrompt, setRemixPrompt] = useState('')
  const [isRemixing, setIsRemixing] = useState<number | null>(null)

  const sortedPosts = useMemo(() => {
    return [...posts].sort((left, right) => {
      const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
      const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
      if (leftTime !== rightTime) return leftTime - rightTime
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    })
  }, [posts])

  const filteredPosts = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return sortedPosts.filter(post => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false
      if (typeFilter !== 'all' && post.contentType !== typeFilter) return false
      if (!needle) return true

      return `${post.title} ${post.caption} ${post.hashtags.join(' ')}`.toLowerCase().includes(needle)
    })
  }, [query, sortedPosts, statusFilter, typeFilter])

  const previewPosts = useMemo(() => {
    return posts
      .filter(post => post.status === 'scheduled' || post.status === 'published')
      .sort((left, right) => {
        const leftTime = new Date(left.postedAt ?? left.scheduledAt ?? left.updatedAt).getTime()
        const rightTime = new Date(right.postedAt ?? right.scheduledAt ?? right.updatedAt).getTime()
        return rightTime - leftTime
      })
  }, [posts])

  const draftMediaUrls = draft ? cleanMediaUrls(draft) : []
  const firstNinePosts = previewPosts.slice(0, 9)
  const laterPreviewPosts = previewPosts.slice(9)

  const copyToClipboard = async (value: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(label)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const openCreate = (contentType: DraftKind) => {
    setNewCategoryName('')
    setDraft(createDraft(contentType))
  }

  const saveDraft = async () => {
    if (!draft) return
    const userId = auth.user?.id
    if (!userId) {
      toast.error('Sign in again before saving.')
      return
    }

    setIsSaving(true)
    try {
      const now = new Date()
      const payload = draftToPayload(draft, userId)
      const postId = draft.id ?? id()

      await db.transact(db.tx.marketingPosts[postId].update({
        ...payload,
        createdAt: draft.id ? undefined : now,
      }))

      toast.success(draft.id ? 'Post updated' : 'Post created')
      setDraft(null)
    } catch (err) {
      console.error('Failed to save marketing post:', err)
      toast.error('Could not save this post')
    } finally {
      setIsSaving(false)
    }
  }

  const duplicatePost = async (post: MarketingPost) => {
    const userId = auth.user?.id
    if (!userId) {
      toast.error('Sign in again before duplicating.')
      return
    }

    const now = new Date()
    const postId = id()

    try {
      await db.transact(db.tx.marketingPosts[postId].update({
        platform: 'instagram',
        contentType: post.contentType,
        status: 'draft',
        userId,
        title: `${post.title} copy`,
        caption: post.caption,
        hashtags: post.hashtags,
        callToAction: post.callToAction,
        firstComment: post.firstComment,
        storyHighlightCategory: post.storyHighlightCategory,
        mediaUrls: post.mediaUrls,
        productIds: post.productIds ?? [],
        isCarousel: post.isCarousel,
        slideCrops: post.slideCrops,
        timezone: post.timezone,
        reminderOffsetHours: post.reminderOffsetHours ?? 1,
        reminderSent: false,
        metrics: undefined,
        createdAt: now,
        updatedAt: now,
      }))

      toast.success('Duplicated as a draft', {
        description: post.status !== 'draft' ? 'Switch to Draft to see the new copy.' : 'The copy is in Draft.',
        action: {
          label: 'Show Drafts',
          onClick: () => {
            setStatusFilter('draft')
            setView('list')
          },
        },
      })
    } catch (err) {
      console.error('Failed to duplicate post:', err)
      toast.error('Could not duplicate this post')
    }
  }

  const deletePost = async (post: MarketingPost) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return
    try {
      await db.transact(db.tx.marketingPosts[post.id].delete())
      toast.success('Post deleted')
    } catch (err) {
      console.error('Failed to delete post:', err)
      toast.error('Could not delete this post')
    }
  }

  const sendTestReminder = async (post: MarketingPost) => {
    setIsSending(post.id)
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'marketing-test', postId: post.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send test reminder')
      toast.success('Test reminder sent')
    } catch (err) {
      console.error('Failed to send reminder:', err)
      toast.error('Could not send the test reminder')
    } finally {
      setIsSending(null)
    }
  }

  const addStoryCategory = async () => {
    const userId = auth.user?.id
    const name = newCategoryName.trim()
    if (!userId || !name) return

    try {
      const now = new Date()
      await db.transact(db.tx.storyCategories[id()].update({
        name,
        userId,
        createdAt: now,
        updatedAt: now,
      }))
      setDraft(current => current ? { ...current, storyHighlightCategory: name } : current)
      setNewCategoryName('')
      toast.success('Story category added')
    } catch (err) {
      console.error('Failed to add story category:', err)
      toast.error('Could not add story category')
    }
  }

  const openFrameEditor = (slideIndex: number, context: MarketingCropContext = 'profile') => {
    if (!draft) return
    const slideCrop = draft.slideCrops.find(item => item.slideIndex === slideIndex) ?? { slideIndex }
    const crop = slideCrop[context]
    setFrameDraft({ slideIndex, context, crop: normalizeCrop(crop), slideCrop })
  }

  const handleFramePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!frameDraft) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({ x: event.clientX, y: event.clientY, crop: frameDraft.crop })
  }

  const handleFramePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !frameDraft) return
    const rect = event.currentTarget.getBoundingClientRect()
    const nextX = dragStart.crop.x + ((event.clientX - dragStart.x) / rect.width) * 100
    const nextY = dragStart.crop.y + ((event.clientY - dragStart.y) / rect.height) * 100
    setFrameDraft({
      ...frameDraft,
      crop: {
        ...frameDraft.crop,
        x: Math.max(-50, Math.min(50, nextX)),
        y: Math.max(-50, Math.min(50, nextY)),
      },
    })
  }

  const saveFrame = () => {
    if (!draft || !frameDraft) return
    setDraft({
      ...draft,
      slideCrops: setSlideCrop(draft.slideCrops, frameDraft.slideIndex, frameDraft.context, frameDraft.crop)
        .map(crop => crop.slideIndex === frameDraft.slideIndex ? commitFrameCrop(frameDraft) : crop),
    })
    setFrameDraft(null)
    toast.success('Frame updated')
  }

  const updateMediaUrl = (index: number, value: string) => {
    setDraft(current => {
      if (!current) return current
      const next = [...current.mediaUrls]
      next[index] = value || ''
      return { ...current, mediaUrls: next }
    })
  }

  const addMediaUrl = () => {
    setDraft(current => {
      if (!current) return current
      const limit = current.contentType === 'post' && current.isCarousel ? 20 : 1
      if (current.mediaUrls.length >= limit) return current
      return { ...current, mediaUrls: [...current.mediaUrls, ''] }
    })
  }

  const handleFileUpload = async (index: number, file: File) => {
    if (!draft) return
    setIsUploading(index)
    try {
      const fileName = `marketing/${draft.id || 'new'}/${Date.now()}-${file.name}`
      const { data } = await db.storage.uploadFile(fileName, file)
      // updateMediaUrl(index, data.url)
      toast.success('File uploaded')
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(null)
    }
  }

  const handleAiRemix = async (index: number) => {
    if (!draft || !remixPrompt.trim()) return
    const sourceUrl = draft.mediaUrls[index]
    if (!sourceUrl) {
      toast.error('Please provide a source image first')
      return
    }

    const taggedProducts = getTaggedProducts(draft, products)
    const productName = taggedProducts[0]?.name || 'product'

    setIsRemixing(index)
    try {
      const response = await fetch('/api/ai-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remix-image',
          imageUrl: sourceUrl,
          instructions: remixPrompt,
          productName,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI generation failed')

      updateMediaUrl(index, data.imageUrl)
      setRemixPrompt('')
      toast.success('Image remixed successfully')
    } catch (err) {
      console.error('AI Remix failed:', err)
      toast.error('Could not remix image')
    } finally {
      setIsRemixing(null)
    }
  }

  const removeMediaUrl = (index: number) => {
    setDraft(current => {
      if (!current) return current
      const next = current.mediaUrls.filter((_, itemIndex) => itemIndex !== index)
      const compacted = next.length ? next : ['']
      return {
        ...current,
        mediaUrls: compacted,
        slideCrops: current.slideCrops
          .filter(crop => crop.slideIndex !== index)
          .map(crop => crop.slideIndex > index ? { ...crop, slideIndex: crop.slideIndex - 1 } : crop),
      }
    })
  }

  const renderPostList = () => (
    <section className="space-y-3">
      {filteredPosts.map(post => {
        const taggedProducts = getTaggedProducts(post, products)
        const profileCrop = getSlideCrop(post.slideCrops, 0, 'profile', post.thumbnailCrop)

        return (
          <article key={post.id} className="grid gap-4 rounded-lg border border-border bg-background p-4 shadow-sm lg:grid-cols-[96px_1fr_auto]">
            <InstagramFrame mediaUrls={post.mediaUrls} crop={profileCrop} alt={post.title} className="rounded-md" />
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground">{post.title}</h2>
                <Badge variant="secondary">{contentTypeLabels[post.contentType]}</Badge>
                {post.isCarousel && <Badge variant="outline"><Images className="mr-1 h-3 w-3" />Carousel</Badge>}
                <Badge>{statusLabels[post.status]}</Badge>
                {post.contentType === 'story' && post.storyHighlightCategory && <Badge variant="outline">{post.storyHighlightCategory}</Badge>}
                {taggedProducts.length > 0 && <Badge variant="outline">{taggedProducts.length} product{taggedProducts.length === 1 ? '' : 's'}</Badge>}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{post.caption || 'No caption yet.'}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('pt-PT') : 'Unscheduled'}</span>
                <span>|</span>
                <span>{post.mediaUrls.length} media</span>
                <span>|</span>
                <span>{taggedProducts.map(product => product.name).join(', ') || 'No products'}</span>
              </div>
            </div>
            <div className="flex items-start justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => copyToClipboard(post.caption, 'Caption copied')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Caption
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyToClipboard(post.hashtags.join(' '), 'Hashtags copied')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Hashtags
                  </DropdownMenuItem>
                  {post.firstComment && (
                    <DropdownMenuItem onClick={() => copyToClipboard(post.firstComment ?? '', 'First comment copied')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy 1st Comment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => copyToClipboard(formatPostText(post), 'Post content copied')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => sendTestReminder(post)} disabled={isSending === post.id}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test Reminder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicatePost(post)}>
                    <CopyPlus className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDraft(draftFromPost(post))}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deletePost(post)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        )
      })}
    </section>
  )

  const renderInstagramPreview = () => (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Instagram grid preview</h2>
          <p className="text-sm text-muted-foreground">Profile tiles use 3:4 crops. The first 9 are your hero grid.</p>
        </div>
        <Badge variant="secondary">{previewPosts.length} planned tiles</Badge>
      </div>

      {previewPosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Schedule or publish posts to preview the grid.
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="grid grid-cols-3 gap-1 rounded-md bg-secondary p-1">
            {Array.from({ length: 9 }).map((_, index) => {
              const post = firstNinePosts[index]
              if (!post) return <div key={`empty-${index}`} className="aspect-[3/4] bg-background/70" />

              const taggedProducts = getTaggedProducts(post, products)
              const profileCrop = getSlideCrop(post.slideCrops, 0, 'profile', post.thumbnailCrop)

              return (
                <InstagramFrame key={post.id} mediaUrls={post.mediaUrls} crop={profileCrop} alt={post.title} className="group">
                  <div className="absolute left-1.5 top-1.5 flex gap-1">
                    <Badge className="opacity-90" variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status === 'published' ? 'Live' : 'Plan'}
                    </Badge>
                    {post.isCarousel && <Badge variant="secondary"><Images className="h-3 w-3" /></Badge>}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate">{post.title}</p>
                    {taggedProducts.length > 0 && <p className="truncate text-white/80">{taggedProducts.map(product => product.name).join(', ')}</p>}
                  </div>
                </InstagramFrame>
              )
            })}
          </div>

          {laterPreviewPosts.length > 0 && (
            <div className="grid grid-cols-3 gap-1 rounded-md bg-secondary p-1">
              {laterPreviewPosts.map(post => {
                const profileCrop = getSlideCrop(post.slideCrops, 0, 'profile', post.thumbnailCrop)
                return (
                  <InstagramFrame key={post.id} mediaUrls={post.mediaUrls} crop={profileCrop} alt={post.title} className="group">
                    {post.isCarousel && <Badge className="absolute left-1.5 top-1.5" variant="secondary"><Images className="h-3 w-3" /></Badge>}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {post.title}
                    </div>
                  </InstagramFrame>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )

  const renderDraftDialog = () => {
    if (!draft) return null

    const isPost = draft.contentType === 'post'
    const isStory = draft.contentType === 'story'
    const isReel = draft.contentType === 'reel'
    const mediaLimit = isPost && draft.isCarousel ? 20 : 1
    const dialogTitle = draft.id ? `Edit ${contentTypeLabels[draft.contentType]}` : `Create ${contentTypeLabels[draft.contentType]}`

    return (
      <Dialog open={Boolean(draft)} onOpenChange={open => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Section title="Basic Info">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label>Title (internal)</Label>
                  <Input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Dragon Launch - Week 1" />
                </div>
                <div>
                  <Label>Content Type</Label>
                  <Input value={contentTypeLabels[draft.contentType]} disabled />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={value => setDraft({ ...draft, status: value as MarketingPostStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scheduled Date/Time</Label>
                  <Input type="datetime-local" value={draft.scheduledAt} onChange={event => setDraft({ ...draft, scheduledAt: event.target.value })} />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Input value={draft.timezone} onChange={event => setDraft({ ...draft, timezone: event.target.value })} />
                </div>
                <div>
                  <Label>Reminder offset hours</Label>
                  <Input type="number" min="0" value={draft.reminderOffsetHours} onChange={event => setDraft({ ...draft, reminderOffsetHours: event.target.value })} />
                </div>
                <div>
                  <Label>Posted Date/Time</Label>
                  <Input type="datetime-local" value={draft.postedAt} onChange={event => setDraft({ ...draft, postedAt: event.target.value })} />
                </div>
              </div>
            </Section>

            <Section title="Content">
              <div>
                <Label>{isStory ? 'Caption (short)' : 'Caption'}</Label>
                <Textarea value={draft.caption} onChange={event => setDraft({ ...draft, caption: event.target.value })} rows={isStory ? 3 : 6} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Hashtags</Label>
                  <Input value={draft.hashtagsText} onChange={event => setDraft({ ...draft, hashtagsText: event.target.value })} placeholder="#em3d #impressao3d" />
                </div>
                {!isStory && (
                  <div>
                    <Label>Call to action</Label>
                    <Input value={draft.callToAction} onChange={event => setDraft({ ...draft, callToAction: event.target.value })} placeholder="Link in bio" />
                  </div>
                )}
              </div>
              {!isStory && (
                <div>
                  <Label>First comment</Label>
                  <Textarea value={draft.firstComment} onChange={event => setDraft({ ...draft, firstComment: event.target.value })} rows={3} placeholder="Posted immediately after publish - good for extra hashtags" />
                </div>
              )}
              {isReel && (
                <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                  Reels work best with 9:16 video. Trend/sound suggestions can be added later.
                </div>
              )}
            </Section>

            <Section title="Media">
              <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                For best results, use 1080x1350px (4:5). Keep key content in center 90% width.
              </div>
              {isPost && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.isCarousel}
                    onCheckedChange={checked => setDraft({
                      ...draft,
                      isCarousel: Boolean(checked),
                      mediaUrls: Boolean(checked) ? draft.mediaUrls : draft.mediaUrls.slice(0, 1),
                    })}
                  />
                  Carousel
                </label>
              )}
              <div className="space-y-4">
                {draft.mediaUrls.slice(0, mediaLimit).map((url, index) => {
                   const profileCrop = getSlideCrop(draft.slideCrops, index, 'profile')
                   return (
                     <div key={index} className="grid gap-4 rounded-md border border-border bg-background p-4 lg:grid-cols-[1fr_92px_auto]">
                       <div className="space-y-4">
                         <div className="space-y-2">
                           <Label>{isReel ? 'Video URL' : isStory ? 'Media URL' : `Media URL ${index + 1}`}</Label>
                           <div className="flex gap-2">
                             <Input 
                               value={url} 
                               onChange={event => updateMediaUrl(index, event.target.value)} 
                               placeholder="https://... or upload a file" 
                               className="flex-1"
                             />
                             <div className="relative">
                               <input
                                 type="file"
                                 id={`media-upload-${index}`}
                                 className="sr-only"
                                 accept="image/*,video/*"
                                 onChange={(e) => {
                                   const file = e.target.files?.[0]
                                   if (file) handleFileUpload(index, file)
                                 }}
                                 disabled={isUploading === index}
                               />
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="icon"
                                 disabled={isUploading === index}
                                 onClick={() => document.getElementById(`media-upload-${index}`)?.click()}
                               >
                                 {isUploading === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                               </Button>
                                <MediaPicker onSelect={(url) => updateMediaUrl(index, url)} />
                              </div>
                            </div>
                          </div>

                          {url && !isReel && (
                            <div className="space-y-2 rounded-md border border-border bg-secondary/10 p-3">
                              <div className="flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-primary" />
                               <span className="text-sm font-medium">AI Remix</span>
                             </div>
                             <div className="flex gap-2">
                               <Input
                                 value={remixPrompt}
                                 onChange={e => setRemixPrompt(e.target.value)}
                                 placeholder="Enter prompt (e.g., 'put it in a forest', 'change to blue')..."
                                 className="flex-1"
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     e.preventDefault();
                                     handleAiRemix(index);
                                   }
                                 }}
                               />
                               <Button
                                 type="button"
                                 size="sm"
                                 disabled={isRemixing === index || !remixPrompt.trim()}
                                 onClick={() => handleAiRemix(index)}
                               >
                                 {isRemixing === index ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
                               </Button>
                             </div>
                             <p className="text-[10px] text-muted-foreground">
                               Generates a variation of the current image based on your instructions.
                             </p>
                           </div>
                         )}
                       </div>
                       
                       <div className="flex flex-col items-center gap-2">
                        <InstagramFrame mediaUrls={[url]} crop={profileCrop} alt={`Media ${index + 1}`} className="h-24 w-[92px] rounded-md border border-border" />
                        <span className="text-[10px] text-muted-foreground">Profile Preview</span>
                       </div>

                       <div className="flex flex-wrap items-end gap-2">
                         <Button type="button" variant="outline" size="sm" onClick={() => openFrameEditor(index, isReel || isStory ? 'story' : 'profile')} disabled={!(url || '').trim()}>
                           <Move className="mr-2 h-4 w-4" />
                           Adjust
                         </Button>
                         {(draft.mediaUrls.length > 1 || index > 0) && (
                           <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeMediaUrl(index)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                     </div>
                   )
                })}
                {draft.mediaUrls.length < mediaLimit && (
                  <Button type="button" variant="outline" onClick={addMediaUrl}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add media
                  </Button>
                )}
              </div>
              {draft.mediaUrls.some(Boolean) && (
                <p className="text-sm text-amber-700">
                  Square or unknown-ratio media may appear cropped in the new 3:4 profile grid.
                </p>
              )}
            </Section>

            <Section title="Products">
              <ProductPicker products={products} selectedIds={draft.productIds} onChange={productIds => setDraft({ ...draft, productIds })} />
            </Section>

            {isStory && (
              <Section title="Story Highlight">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <Label>Category</Label>
                    <Select value={draft.storyHighlightCategory || 'none'} onValueChange={value => setDraft({ ...draft, storyHighlightCategory: value === 'none' ? '' : value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No highlight</SelectItem>
                        {storyCategories.map(category => <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Add new</Label>
                    <Input value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder="Workshop" />
                  </div>
                  <Button type="button" variant="outline" className="self-end" onClick={addStoryCategory} disabled={!newCategoryName.trim()}>
                    Add
                  </Button>
                </div>
              </Section>
            )}

            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => copyToClipboard(draft.caption, 'Caption copied')}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy caption
                </Button>
                <Button type="button" variant="outline" onClick={() => copyToClipboard(formatHashtags(draft.hashtagsText).join(' '), 'Hashtags copied')}>
                  Copy hashtags
                </Button>
                {draft.firstComment && (
                  <Button type="button" variant="outline" onClick={() => copyToClipboard(draft.firstComment, 'First comment copied')}>
                    Copy first comment
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => copyToClipboard(formatPostText(draftToPayload(draft, auth.user?.id ?? 'draft')), 'Draft content copied')}>
                  Copy all
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="button" onClick={saveDraft} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Marketing Hub</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Plan Instagram posts, stories, and reels with accurate profile crops.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button">
              <Plus className="mr-2 h-4 w-4" />
              Create
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openCreate('post')}>
              <Images className="h-4 w-4" />
              Post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreate('story')}>
              <Instagram className="h-4 w-4" />
              Story
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openCreate('reel')}>
              <Video className="h-4 w-4" />
              Reel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {view === 'list' && (
            <div className="flex flex-col gap-2 lg:flex-row">
              <Select value={statusFilter} onValueChange={value => setStatusFilter(value as MarketingPostStatus | 'all')}>
                <SelectTrigger className="lg:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['all', ...statuses].map(status => (
                    <SelectItem key={status} value={status}>{statusLabels[status as MarketingPostStatus | 'all']}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={value => setTypeFilter(value as MarketingContentType | 'all')}>
                <SelectTrigger className="lg:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {contentTypes.map(type => <SelectItem key={type} value={type}>{contentTypeLabels[type]}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={event => setQuery(event.target.value)} className="pl-9 sm:w-72" placeholder="Search content..." />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {view === 'preview' && (
              <Button type="button" variant={view === 'preview' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
                <LayoutList className="mr-2 h-4 w-4" />
                List View
              </Button>
            )}
            {view === 'list' && (
              <Button type="button" variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('preview')}>
                <Grid3X3 className="mr-2 h-4 w-4" />
                Feed View
              </Button>
            )}
          </div>
        </div>
      </section>

      {view === 'list' ? renderPostList() : renderInstagramPreview()}

      {view === 'list' && filteredPosts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium text-foreground">No Instagram posts found.</p>
          <p className="mt-1 text-sm text-muted-foreground">Create content or adjust your filters.</p>
        </div>
      )}

      {renderDraftDialog()}

      <Dialog open={Boolean(frameDraft)} onOpenChange={open => !open && setFrameDraft(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Adjust frame</DialogTitle>
          </DialogHeader>
          {frameDraft && (
            <div className="grid gap-6 lg:grid-cols-[minmax(280px,1fr)_280px]">
              <div
                className="cursor-grab touch-none overflow-hidden rounded-lg border border-border active:cursor-grabbing"
                onPointerDown={handleFramePointerDown}
                onPointerMove={handleFramePointerMove}
                onPointerUp={() => setDragStart(null)}
                onPointerCancel={() => setDragStart(null)}
              >
                <InstagramFrame
                  mediaUrls={draftMediaUrls}
                  slideIndex={frameDraft.slideIndex}
                  crop={frameDraft.crop}
                  aspect={frameDraft.context}
                  alt="Frame preview"
                  className="mx-auto w-full max-w-md"
                />
              </div>
              <div className="space-y-5">
                <div>
                  <Label>Preview mode</Label>
                  <div className="mt-2 grid gap-2">
                    {cropContexts.map(context => (
                    <Button
                        key={context}
                        type="button"
                        variant={frameDraft.context === context ? 'default' : 'outline'}
                        onClick={() => {
                          const committed = commitFrameCrop(frameDraft)
                          setFrameDraft({
                            slideIndex: frameDraft.slideIndex,
                            context,
                            crop: normalizeCrop(committed[context]),
                            slideCrop: committed,
                          })
                        }}
                      >
                        {cropContextLabels[context]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Zoom</Label>
                  <Slider value={[frameDraft.crop.zoom]} min={1} max={3} step={0.05} onValueChange={value => setFrameDraft({ ...frameDraft, crop: { ...frameDraft.crop, zoom: value[0] ?? 1 } })} className="mt-3" />
                  <p className="mt-2 text-xs text-muted-foreground">{frameDraft.crop.zoom.toFixed(2)}x</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                  Drag the media to adjust the crop for this context. Profile grid is 3:4, feed is 4:5, and story/reel is 9:16.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setFrameDraft({ ...frameDraft, crop: { x: 0, y: 0, zoom: 1 } })}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setFrameDraft(null)}>Cancel</Button>
                  <Button type="button" onClick={saveFrame}>Save frame</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
