export type MarketingContentType = 'post' | 'story' | 'reel'
export type MarketingPostStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type MarketingPlatform = 'instagram'
export type MarketingCropContext = 'profile' | 'feed' | 'story'

export interface MarketingMetrics {
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  reach?: number
}

export interface MarketingCrop {
  x: number
  y: number
  zoom?: number
}

export interface MarketingThumbnailCrop extends MarketingCrop {
  slideIndex?: number
}

export interface MarketingSlideCrop {
  slideIndex: number
  profile?: MarketingCrop
  feed?: MarketingCrop
  story?: MarketingCrop
}

export interface MarketingPost {
  id: string
  platform: MarketingPlatform
  contentType: MarketingContentType
  status: MarketingPostStatus
  userId: string
  title: string
  caption: string
  hashtags: string[]
  callToAction?: string
  firstComment?: string
  storyHighlightCategory?: string
  mediaUrls: string[]
  productIds: string[]
  isCarousel: boolean
  slideCrops?: MarketingSlideCrop[]
  thumbnailCrop?: MarketingThumbnailCrop
  scheduledAt?: Date
  timezone: string
  reminderOffsetHours: number
  reminderSent: boolean
  reminderSentAt?: Date
  postedAt?: Date
  metrics?: MarketingMetrics
  createdAt: Date
  updatedAt: Date
}

export interface StoryCategory {
  id: string
  name: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
