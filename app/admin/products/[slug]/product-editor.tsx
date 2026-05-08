'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, Download, ImageIcon, ImagePlus, Loader2, Package, Plus, Save, Settings, ShieldCheck, Sparkles, Tag, Trash2, Upload, Wand2, Wrench, X } from 'lucide-react'
import { id, db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createCatalogProductFallback,
  defaultGlobalColors,
  getProductMaterialRecipe,
  normalizeCategorySlugs,
  normalizeCategorySlug,
  products,
  type CatalogProductRecord,
  type CustomizationOption,
  type GlobalColor,
  type Product,
  type ProductColorInventory,
  type ProductInventory,
  type ProductStlFile,
  type ProductVariantOption,
  type ProductMaterialRequirement,
  type ProductionJobTemplate,
} from '@/lib/products'
import { AIActionType, useAIActions } from '@/hooks/useAIActions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIProductModal } from '../../_components/ai-product-modal'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ColorRecord = GlobalColor & { id: string }
type CatalogRecord = CatalogProductRecord & { id: string; updatedAt?: Date }
type InventoryRecord = ProductInventory & { id: string; updatedAt?: Date }
type CategoryRecord = {
  id: string
  slug: string
  label: string
  description?: string
  sortOrder: number
  visible: boolean
}
type DraftCustomizationOption = Omit<CustomizationOption, 'maxChars' | 'priceAdd'> & {
  maxChars: string
  priceAdd: string
}
type DraftMaterialRequirement = Omit<ProductMaterialRequirement, 'grams' | 'colorName'> & {
  grams: string
}
type DraftColorInventory = Omit<ProductColorInventory, 'stockQuantity'> & {
  stockQuantity: string
}
type DraftVariantPart = Omit<NonNullable<ProductVariantOption['parts']>[number], 'grams'> & {
  grams: string
}
type DraftVariantOption = Omit<ProductVariantOption, 'priceAdd' | 'finalPrice' | 'stockQuantity' | 'estimatedPrintMinutes' | 'customizationOptions' | 'parts'> & {
  priceAdd: string
  finalPrice: string
  stockQuantity: string
  estimatedPrintMinutes: string
  parts: DraftVariantPart[]
  customizationOptions: DraftCustomizationOption[]
}
type DraftStlFile = ProductStlFile

function createDraftVariantOption(
  index: number,
  colors: GlobalColor[],
  kind: ProductVariantOption['kind'],
): DraftVariantOption {
  const color = colors[0]
  return {
    id: id(),
    name: kind === 'custom_text' ? `Custom text ${index + 1}` : kind === 'single_color' ? `Color ${index + 1}` : `Pack ${index + 1}`,
    kind,
    image: '',
    priceAdd: '',
    finalPrice: '',
    stockQuantity: '0',
    estimatedPrintMinutes: '',
    colors: color ? [{ name: color.name, hex: color.hex, globalColorId: color.id }] : [],
    parts: [],
    customizationOptions: kind === 'custom_text'
      ? [{ type: 'text', label: 'Text', maxChars: '12', priceAdd: '0' }]
      : [],
  }
}

function toDraftVariantOption(option: ProductVariantOption): DraftVariantOption {
  return {
    ...option,
    image: option.image ?? '',
    priceAdd: option.priceAdd ? String(option.priceAdd) : '',
    finalPrice: option.finalPrice ? String(option.finalPrice) : '',
    stockQuantity: String(option.stockQuantity ?? 0),
    estimatedPrintMinutes: option.estimatedPrintMinutes ? String(option.estimatedPrintMinutes) : '',
    parts: (option.parts ?? []).map(part => ({
      ...part,
      grams: String(part.grams),
    })),
    customizationOptions: (option.customizationOptions ?? []).map(customization => ({
      ...customization,
      maxChars: String(customization.maxChars),
      priceAdd: String(customization.priceAdd),
    })),
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeImageUrls(value: (string | undefined | null)[]) {
  return Array.from(
    new Set(
      value
        .map(url => String(url ?? '').trim())
        .filter(Boolean),
    ),
  )
}

function mergeColors(records?: ColorRecord[]) {
  const byName = new Map(defaultGlobalColors.map(color => [color.name, color]))
  records?.forEach(color => byName.set(color.name, color))
  return [...byName.values()]
}

function getCategoryIdsForSlugs(categories: CategoryRecord[], slugs: string[]) {
  const wanted = new Set(slugs)
  return categories.filter(category => wanted.has(category.slug)).map(category => category.id)
}

function linkCatalogRelations<TTransaction>(
  transaction: TTransaction,
  categories: CategoryRecord[],
  categorySlugs: string[],
  inventoryId?: string,
  existingCategoryIds: string[] = [],
  existingPrimaryCategoryId?: string,
) {
  const linkedCategoryIds = getCategoryIdsForSlugs(categories, categorySlugs)
  const primaryCategoryId = linkedCategoryIds[0]
  let linkedTransaction = transaction as TTransaction & {
    link: (links: Record<string, string | string[]>) => TTransaction
    unlink: (links: Record<string, string | string[]>) => TTransaction
  }
  const linkedCategoryIdSet = new Set(linkedCategoryIds)
  const unlinkedCategoryIds = existingCategoryIds.filter(categoryId => !linkedCategoryIdSet.has(categoryId))

  if (unlinkedCategoryIds.length) {
    linkedTransaction = linkedTransaction.unlink({ categories: unlinkedCategoryIds }) as typeof linkedTransaction
  }

  if (existingPrimaryCategoryId && existingPrimaryCategoryId !== primaryCategoryId) {
    linkedTransaction = linkedTransaction.unlink({ primaryCategory: existingPrimaryCategoryId }) as typeof linkedTransaction
  }

  if (primaryCategoryId) {
    linkedTransaction = linkedTransaction.link({ primaryCategory: primaryCategoryId }) as typeof linkedTransaction
  }

  if (linkedCategoryIds.length) {
    linkedTransaction = linkedTransaction.link({ categories: linkedCategoryIds }) as typeof linkedTransaction
  }

  if (inventoryId) {
    linkedTransaction = linkedTransaction.link({ inventory: inventoryId }) as typeof linkedTransaction
  }

  return linkedTransaction
}

function getCatalogCategoryIds(catalogProduct?: CatalogRecord) {
  return catalogProduct?.categories?.flatMap(category => category.id ? [category.id] : []) ?? []
}

function getCatalogPrimaryCategoryId(catalogProduct?: CatalogRecord) {
  return catalogProduct?.primaryCategory?.id
}

export function ProductEditor({ slug }: { slug: string }) {
  const auth = db.useAuth()

  const query = db.useQuery(auth.user ? {
    globalColors: {},
    productCategories: {},
    catalogProducts: {
      $: {
        where: { slug },
      },
      primaryCategory: {},
      categories: {},
      inventory: {},
    },
    productInventory: {
      $: {
        where: { productSlug: slug },
      },
      product: {},
    },
  } : null)

  const staticProduct = products.find(product => product.slug === slug)
  const catalogProduct = query.data?.catalogProducts?.[0] as unknown as CatalogRecord | undefined
  const inventory = query.data?.productInventory?.[0] as unknown as InventoryRecord | undefined
  const colors = useMemo(() => mergeColors(query.data?.globalColors as ColorRecord[] | undefined), [query.data?.globalColors])
  const categories = useMemo(() => {
    return ((query.data?.productCategories ?? []) as CategoryRecord[])
      .sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999))
  }, [query.data?.productCategories])
  const product = useMemo(
    () => catalogProduct
      ? createCatalogProductFallback(catalogProduct)
      : staticProduct ?? createCatalogProductFallback({ slug }),
    [catalogProduct, slug, staticProduct],
  )

  const initialInventory = useMemo(() => {
    const existing = new Map((inventory?.colorInventory ?? []).map(color => [color.colorName, color]))

    return colors.map(color => {
      const saved = existing.get(color.name)
      return {
        colorName: color.name,
        colorHex: color.hex,
        offered: saved?.offered ?? color.spoolStatus !== 'archived',
        stockQuantity: String(saved?.stockQuantity ?? 0),
        gramsAvailable: color.gramsAvailable,
      }
    })
  }, [colors, inventory?.colorInventory])

  const [name, setName] = useState(product.name)
  const [productSlug, setProductSlug] = useState(product.slug)
  const [category, setCategory] = useState(product.category)
  const [categorySlugsText, setCategorySlugsText] = useState(normalizeCategorySlugs([product.category, ...(product.categorySlugs ?? [])]).join(', '))
  const [priceFrom, setPriceFrom] = useState(String(product.priceFrom))
  const [priceTo, setPriceTo] = useState(String(product.priceTo))
  const [salePrice, setSalePrice] = useState(product.salePrice ? String(product.salePrice) : '')
  const [aspectRatioText, setAspectRatioText] = useState(product.aspectRatio?.join(':') ?? '')
  const [benefit, setBenefit] = useState(product.benefit)
  const [description, setDescription] = useState(product.description)
  const [image, setImage] = useState(product.image)
  const [mediaUrls, setMediaUrls] = useState(() => normalizeImageUrls(product.images?.length ? product.images : [product.image]))
  const [manualMediaUrl, setManualMediaUrl] = useState('')
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [isUploadingStl, setIsUploadingStl] = useState(false)
  const [draftCatalogId] = useState(() => id())
  const [variantPickerId, setVariantPickerId] = useState<string | null>(null)
  const [customizable, setCustomizable] = useState(Boolean(product.customizable))
  const [customizationOptions, setCustomizationOptions] = useState<DraftCustomizationOption[]>(
    (product.customizationOptions ?? []).map(option => ({
      ...option,
      maxChars: String(option.maxChars),
      priceAdd: String(option.priceAdd),
    })),
  )
  const [multiColor, setMultiColor] = useState(Boolean(product.multiColor))
  const [multiColorCount, setMultiColorCount] = useState(String(product.multiColorCount ?? 1))
  const [colorSelectionMode, setColorSelectionMode] = useState<Product['colorSelectionMode']>(product.colorSelectionMode ?? (product.variants?.length ? 'preset_options' : product.multiColor ? 'flexible_parts' : 'single'))
  const [multiColorPriceAdd, setMultiColorPriceAdd] = useState(String(product.multiColorPriceAdd ?? 0))
  const [variants, setVariants] = useState<DraftVariantOption[]>((product.variants ?? []).map(toDraftVariantOption))
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [featured, setFeatured] = useState(Boolean(product.featured))
  const [featuredRank, setFeaturedRank] = useState(String(product.featuredRank ?? 99))
  const [sortOrder, setSortOrder] = useState(String(product.sortOrder ?? product.featuredRank ?? 99))
  const [visible, setVisible] = useState(product.visible !== false)
  const [isModular, setIsModular] = useState(Boolean(product.isModular))
  const [leadTimeDays, setLeadTimeDays] = useState(String(inventory?.leadTimeDays ?? product.leadTimeDays ?? 4))
  const [allowCustomColorRequest, setAllowCustomColorRequest] = useState(Boolean(inventory?.allowCustomColorRequest ?? product.allowCustomColorRequest))
  const [materialRecipe, setMaterialRecipe] = useState<DraftMaterialRequirement[]>(
    getProductMaterialRecipe(product).map(item => ({
      label: item.label,
      grams: String(item.grams),
      materialType: item.materialType,
      colorSource: item.colorSource,
      requiresLithophaneProcessing: item.requiresLithophaneProcessing,
    })),
  )
  const [stlFiles, setStlFiles] = useState<DraftStlFile[]>(product.stlFiles ?? [])
  const [slicerNotes, setSlicerNotes] = useState(product.slicerNotes ?? '')
  const [productionJobTemplatesJson, setProductionJobTemplatesJson] = useState<string>(() => {
    const templates = (product as any).productionJobTemplates as ProductionJobTemplate[] | undefined
    if (templates && templates.length > 0) {
      return JSON.stringify(templates, null, 2)
    }
    // Initialize to empty array when no templates exist
    return JSON.stringify([], null, 2)
  })
  const [colorInventory, setColorInventory] = useState<DraftColorInventory[]>(initialInventory)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isAiModalOpen, setAiModalOpen] = useState(false)
  const [aiAction, setAiAction] = useState<AIActionType>('improvements')

  // Inline AI Remixing State
  const [inlineRemixPrompt, setInlineRemixPrompt] = useState('')
  const [isInlineRemixing, setIsInlineRemixing] = useState(false)
  const [isUploadingAiImage, setIsUploadingAiImage] = useState(false)

  // STL Generation from Image State
  const [showGenerateStlDialog, setShowGenerateStlDialog] = useState(false)
  const [isGeneratingStl, setIsGeneratingStl] = useState(false)
  const [generateStlImageUrl, setGenerateStlImageUrl] = useState('')
  const [generateStlVariantId, setGenerateStlVariantId] = useState('')

  const {
    generateImprovements,
    generateMarketing,
    generateNewImage,
    remixExistingImage,
  } = useAIActions({ 
    product: { 
      id: slug, 
      name, 
      description,
      imageUrl: image 
    } 
  })

  const appendMediaUrl = (url: string) => {
    const cleanUrl = url.trim()
    if (!cleanUrl) return
    setMediaUrls(current => normalizeImageUrls([...current, cleanUrl]))
  }

  const moveMediaUrl = (index: number, direction: -1 | 1) => {
    setMediaUrls(current => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const selected = next[index]
      next[index] = next[nextIndex]
      next[nextIndex] = selected
      setImage(next[0] ?? '')
      return next
    })
  }

  const removeMediaUrl = (url: string) => {
    setMediaUrls(current => {
      const next = current.filter(item => item !== url)
      if (image === url) setImage(next[0] ?? '')
      setVariants(variants => variants.map(variant => variant.image === url ? { ...variant, image: '' } : variant))
      return next
    })
  }

  const handleAddManualMediaUrl = () => {
    appendMediaUrl(manualMediaUrl)
    if (!image.trim()) setImage(manualMediaUrl.trim())
    setManualMediaUrl('')
  }

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploadingMedia(true)
    setError('')
    try {
      const cleanSlug = slugify(productSlug || name || slug)
      const extension = file.name.split('.').pop() || 'png'
      const storagePath = `products/${cleanSlug}/${id()}.${extension}`
      await db.storage.uploadFile(storagePath, file)
      const downloadUrl = await db.storage.getDownloadUrl(storagePath)
      appendMediaUrl(downloadUrl)
      if (!image.trim()) setImage(downloadUrl)
    } catch (err) {
      console.error('Media upload failed:', err)
      setError('Image upload failed. Please try again.')
    } finally {
      setIsUploadingMedia(false)
    }
  }

  const handleStlUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const allowedExtensions = ['.stl', '.3mf']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
      setError('Only .stl and .3mf files are supported.')
      return
    }

    setIsUploadingStl(true)
    setError('')
    try {
      const productId = catalogProduct?.id ?? draftCatalogId
	      const response = await fetch('/api/upload-stl', {
	        method: 'POST',
	        headers: { 'Content-Type': 'application/json' },
	        body: JSON.stringify({
          productId,
          fileName: file.name,
	          fileType: file.type || 'model/stl',
	        }),
	      })
	      if (!response.ok) {
	        let errorText = ''
	        try {
	          errorText = await response.text()
	        } catch {
	          errorText = ''
	        }
	        throw new Error(errorText || 'Failed to prepare STL upload')
	      }
	      const payload = await response.json()

      const uploadResponse = await fetch(payload.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'model/stl' },
        body: file,
      })
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload STL file')
      }

      const displayName = file.name.replace(/\.(stl|3mf)$/i, '').replace(/[-_]+/g, ' ')
      setStlFiles(current => [
        ...current,
        {
          url: payload.publicUrl,
          name: displayName,
          notes: '',
          variantId: '',
        },
      ])
    } catch (err) {
      console.error('STL upload failed:', err)
      setError(err instanceof Error ? err.message : 'STL upload failed. Please try again.')
    } finally {
      setIsUploadingStl(false)
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  const handleInlineRemix = async () => {
    if (!image || !inlineRemixPrompt) return
    
    setIsInlineRemixing(true)
    try {
      const result = await remixExistingImage(image, inlineRemixPrompt)
      if (result?.imageUrl) {
        // Auto upload to InstantDB
        setIsUploadingAiImage(true)
        // 2. Convert base64/URL to a Blob
        const response = await fetch(result.imageUrl);
        const blob = await response.blob();
        
        // Use id() from InstantDB (works in all browsers including mobile)
        const uniqueId = id().slice(0, 8); 
        const fileName = `remix-${slug}-${uniqueId}.png`;
        const file = new File([blob], fileName, { type: blob.type || 'image/png' });
        
        const storagePath = `products/${slug}/${fileName}`;
        
        // 3. Upload to InstantDB
        await db.storage.uploadFile(storagePath, file);
        const downloadUrl = await db.storage.getDownloadUrl(storagePath);

        appendMediaUrl(downloadUrl);
        setInlineRemixPrompt('');
      }
    } catch (err) {
      console.error('Inline remix failed:', err)
      setError('AI Remix failed. Please try again.')
    } finally {
      setIsInlineRemixing(false)
      setIsUploadingAiImage(false)
    }
  }

  const handleInlineGenerate = async () => {
    if (!inlineRemixPrompt) return
    
    setIsInlineRemixing(true)
    try {
      const result = await generateNewImage(inlineRemixPrompt, "blurry, low quality, distorted", "1024x1024")
      if (result?.url) {
        // Auto upload to InstantDB
        setIsUploadingAiImage(true)
        const response = await fetch(result.url)
        const blob = await response.blob()
        const fileName = `gen-${slug}-${id().slice(0, 4)}.png`
        const file = new File([blob], fileName, { type: 'image/png' })
        
        const storagePath = `products/${slug}/${fileName}`
        await db.storage.uploadFile(storagePath, file)
        const downloadUrl = await db.storage.getDownloadUrl(storagePath)

        appendMediaUrl(downloadUrl)
        if (!image.trim()) setImage(downloadUrl)
        setInlineRemixPrompt('')
      }
    } catch (err) {
      console.error('Inline generation failed:', err)
      setError('AI Generation failed. Please try again.')
    } finally {
      setIsInlineRemixing(false)
      setIsUploadingAiImage(false)
    }
  }

  const handleGenerateStlFromImage = async () => {
    if (!generateStlImageUrl.trim()) {
      setError('Please enter an image URL')
      return
    }

    setIsGeneratingStl(true)
    setError('')

    try {
      const productId = catalogProduct?.id ?? draftCatalogId

      const response = await fetch('/api/generate-3dmodel-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generateStlImageUrl.trim(),
          productId,
          variantId: generateStlVariantId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate STL')
      }

      const data = await response.json()

      if (data.success && data.file) {
        setStlFiles(current => [
          ...current,
          {
            url: data.file.url,
            name: data.file.name,
            notes: 'Generated from image via Tripo3D',
            variantId: data.file.variantId || '',
            source: 'tripo3d',
          },
        ])
        setShowGenerateStlDialog(false)
        setGenerateStlImageUrl('')
        setGenerateStlVariantId('')
      }
    } catch (err) {
      console.error('STL generation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate STL. Please try again.')
    } finally {
      setIsGeneratingStl(false)
    }
  }

  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'marketing'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (query.isLoading) return

    setName(product.name)
    setProductSlug(product.slug)
    setCategory(product.category)
    setCategorySlugsText(normalizeCategorySlugs([product.category, ...(product.categorySlugs ?? [])]).join(', '))
    setPriceFrom(String(product.priceFrom))
    setPriceTo(String(product.priceTo))
    setSalePrice(product.salePrice ? String(product.salePrice) : '')
    setAspectRatioText(product.aspectRatio?.join(':') ?? '')
    setBenefit(product.benefit)
    setDescription(product.description)
    setImage(product.image)
    setMediaUrls(normalizeImageUrls(product.images?.length ? product.images : [product.image]))
    setManualMediaUrl('')
    setVariantPickerId(null)
    setCustomizable(Boolean(product.customizable))
    setCustomizationOptions((product.customizationOptions ?? []).map(option => ({
      ...option,
      maxChars: String(option.maxChars),
      priceAdd: String(option.priceAdd),
    })))
    setMultiColor(Boolean(product.multiColor))
    setMultiColorCount(String(product.multiColorCount ?? 1))
    setColorSelectionMode(product.colorSelectionMode ?? (product.variants?.length ? 'preset_options' : product.multiColor ? 'flexible_parts' : 'single'))
    setMultiColorPriceAdd(String(product.multiColorPriceAdd ?? 0))
    setVariants((product.variants ?? []).map(toDraftVariantOption))
    setPreviewImageUrl('')
    setFeatured(Boolean(product.featured))
    setFeaturedRank(String(product.featuredRank ?? 99))
    setSortOrder(String(product.sortOrder ?? product.featuredRank ?? 99))
    setVisible(product.visible !== false)
    setIsModular(Boolean(product.isModular))
    setLeadTimeDays(String(inventory?.leadTimeDays ?? product.leadTimeDays ?? 4))
    setAllowCustomColorRequest(Boolean(inventory?.allowCustomColorRequest ?? product.allowCustomColorRequest))
    setMaterialRecipe(getProductMaterialRecipe(product).map(item => ({
      label: item.label,
      grams: String(item.grams),
      materialType: item.materialType,
      colorSource: item.colorSource,
      requiresLithophaneProcessing: item.requiresLithophaneProcessing,
    })))
    setStlFiles(product.stlFiles ?? [])
    setSlicerNotes(product.slicerNotes ?? '')
    const templates = (product as any).productionJobTemplates as ProductionJobTemplate[] | undefined
    setProductionJobTemplatesJson(JSON.stringify(templates ?? [], null, 2))
    setColorInventory(initialInventory)
  }, [initialInventory, inventory?.allowCustomColorRequest, inventory?.leadTimeDays, product, query.isLoading])

  if (auth.isLoading || query.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  if (!auth.user) {
    return (
      <main className="min-h-screen bg-secondary px-4 py-10">
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-background p-6">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
          </div>
          <p className="text-sm text-muted-foreground">Sign in from the main admin page before editing products.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/admin">Back to admin</Link>
          </Button>
        </div>
      </main>
    )
  }

  const updateOption = (index: number, patch: Partial<DraftCustomizationOption>) => {
    setCustomizationOptions(current => current.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option))
  }

  const updateRecipe = (index: number, patch: Partial<DraftMaterialRequirement>) => {
    setMaterialRecipe(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const updateColor = (colorName: string, patch: Partial<DraftColorInventory>) => {
    setColorInventory(current => current.map(color => color.colorName === colorName ? { ...color, ...patch } : color))
  }

  const updateVariant = (variantId: string, patch: Partial<DraftVariantOption>) => {
    setVariants(current => current.map(variant => variant.id === variantId ? { ...variant, ...patch } : variant))
  }

  const updateVariantColor = (variantId: string, colorIndex: number, colorName: string) => {
    const globalColor = colors.find(color => color.name === colorName)
    setVariants(current => current.map(variant => {
      if (variant.id !== variantId) return variant
      return {
        ...variant,
        colors: variant.colors.map((color, index) => index === colorIndex
          ? { ...color, name: colorName, hex: globalColor?.hex ?? color.hex, globalColorId: globalColor?.id }
          : color),
      }
    }))
  }

  const updateVariantColorImage = (variantId: string, colorIndex: number, imageUrl: string) => {
    setVariants(current => current.map(variant => {
      if (variant.id !== variantId) return variant
      return {
        ...variant,
        colors: variant.colors.map((color, index) => index === colorIndex
          ? { ...color, imageUrl }
          : color),
      }
    }))
  }

  const addColorToVariant = (variantId: string) => {
    const globalColor = colors[0]
    if (!globalColor) return
    setVariants(current => current.map(variant => variant.id === variantId
      ? { ...variant, colors: [...variant.colors, { name: globalColor.name, hex: globalColor.hex, globalColorId: globalColor.id }] }
      : variant))
  }

  const updateVariantPart = (variantId: string, partIndex: number, patch: Partial<DraftVariantPart>) => {
    setVariants(current => current.map(variant => variant.id === variantId
      ? {
          ...variant,
          parts: variant.parts.map((part, index) => index === partIndex ? { ...part, ...patch } : part),
        }
      : variant))
  }

  const addVariantPart = (variantId: string) => {
    setVariants(current => current.map(variant => variant.id === variantId
      ? {
          ...variant,
          parts: [
            ...variant.parts,
            {
              label: `Parte ${variant.parts.length + 1}`,
              grams: '10',
              materialType: 'PLA',
              colorSource: 'partColor',
            },
          ],
        }
      : variant))
  }

  const useDefaultRecipeForVariant = (variantId: string) => {
    setVariants(current => current.map(variant => variant.id === variantId
      ? {
          ...variant,
          parts: materialRecipe.map(part => ({
            label: part.label,
            grams: part.grams,
            materialType: part.materialType,
            colorSource: part.colorSource,
            requiresLithophaneProcessing: part.requiresLithophaneProcessing,
          })),
        }
      : variant))
  }

  const updateVariantCustomization = (variantId: string, index: number, patch: Partial<DraftCustomizationOption>) => {
    setVariants(current => current.map(variant => variant.id === variantId
      ? {
          ...variant,
          customizationOptions: variant.customizationOptions.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option),
        }
      : variant))
  }

  const addVariantCustomization = (variantId: string) => {
    setVariants(current => current.map(variant => variant.id === variantId
      ? {
          ...variant,
          customizationOptions: [...variant.customizationOptions, { type: 'text', label: 'Text', maxChars: '12', priceAdd: '0' }],
        }
      : variant))
  }

  const removeVariantCustomization = (variantId: string, index: number) => {
    setVariants(current => current.map(variant => variant.id === variantId
      ? {
          ...variant,
          customizationOptions: variant.customizationOptions.filter((_, optionIndex) => optionIndex !== index),
        }
      : variant))
  }

  const updateStlFile = (index: number, patch: Partial<DraftStlFile>) => {
    setStlFiles(current => current.map((file, fileIndex) => fileIndex === index ? { ...file, ...patch } : file))
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaved(false)

    const cleanSlug = slugify(productSlug || name)
    if (!cleanSlug) {
      setError('Product needs a name or slug.')
      return
    }

    setIsSaving(true)

    try {
      const gallery = normalizeImageUrls(mediaUrls)
      const primaryImage = image.trim() || gallery[0] || '/products/ball-marker.jpg'
      const finalImages = normalizeImageUrls([primaryImage, ...gallery.filter(url => url !== primaryImage)])
      const productCategorySlugs = normalizeCategorySlugs([category, categorySlugsText])
      const [aspectWidth, aspectHeight] = aspectRatioText.split(':').map(value => Number(value.trim()))
      const aspectRatio = aspectWidth > 0 && aspectHeight > 0
        ? [aspectWidth, aspectHeight] as [number, number]
        : undefined
      const recipe = materialRecipe.map((item, index) => ({
        label: item.label || `Part ${index + 1}`,
        grams: Math.max(1, Number(item.grams) || 1),
        materialType: item.materialType,
        colorSource: item.colorSource,
        requiresLithophaneProcessing: Boolean(item.requiresLithophaneProcessing),
      }))
      // Parse and validate production job templates
      let productionJobTemplates: ProductionJobTemplate[] | undefined
      try {
        const parsed = JSON.parse(productionJobTemplatesJson)
        if (!Array.isArray(parsed)) {
          throw new Error('Production job templates must be an array')
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          productionJobTemplates = parsed.map((t: any) => ({
            partLabel: String(t.partLabel || 'Part'),
            colorSource: ['baseColor', 'none', 'lithophane'].includes(t.colorSource) ? t.colorSource : 'baseColor',
            materialGrams: Math.max(1, Number(t.materialGrams) || 1),
            materialType: ['PLA', 'PETG', 'ABS', 'TPU'].includes(t.materialType) ? t.materialType : 'PLA',
            requiresLithophaneProcessing: Boolean(t.requiresLithophaneProcessing),
          }))
        }
      } catch (parseError) {
        // Invalid JSON, abort save
        setError('Invalid JSON in production job templates. Please fix the JSON syntax.')
        setIsSaving(false)
        return
      }
      const gramsByColor = new Map(colors.map(color => [color.name, color.gramsAvailable]))
      const normalizedColorInventory = colorInventory.map(color => ({
        ...color,
        stockQuantity: color.offered ? Number(color.stockQuantity) || 0 : 0,
        gramsAvailable: gramsByColor.get(color.colorName) ?? 0,
      }))
      const offeredColors = normalizedColorInventory.filter(color => color.offered)
      const normalizedVariants: ProductVariantOption[] = variants
        .map((variant, index) => ({
          id: variant.id || id(),
          name: variant.name.trim() || `Option ${index + 1}`,
          kind: variant.kind,
          image: variant.image?.trim() || undefined,
          priceAdd: variant.priceAdd.trim() ? Math.max(0, Number(variant.priceAdd) || 0) : undefined,
          finalPrice: variant.finalPrice.trim() ? Math.max(0, Number(variant.finalPrice) || 0) : undefined,
          stockQuantity: Math.max(0, Number(variant.stockQuantity) || 0),
          estimatedPrintMinutes: variant.estimatedPrintMinutes.trim() ? Math.max(0, Number(variant.estimatedPrintMinutes) || 0) : undefined,
          aspectRatio: variant.aspectRatio,
          formatLabel: variant.formatLabel,
          uploadGuidance: variant.uploadGuidance,
          variantType: variant.variantType,
          requiresPartColorSelection: variant.requiresPartColorSelection,
          textOverlay: variant.textOverlay,
          parts: variant.parts
            .map((part, partIndex) => ({
              label: part.label || `Parte ${partIndex + 1}`,
              grams: Math.max(1, Number(part.grams) || 1),
              materialType: part.materialType,
              colorSource: part.colorSource,
              requiresLithophaneProcessing: Boolean(part.requiresLithophaneProcessing),
            }))
            .filter(part => part.label),
          colors: variant.colors
            .map(color => {
              const globalColor = colors.find(item => item.name === color.name)
              return {
                name: color.name,
                hex: globalColor?.hex ?? color.hex ?? '#d1d5db',
                globalColorId: color.globalColorId ?? globalColor?.id,
                imageUrl: color.imageUrl?.trim() || undefined,
              }
            })
            .filter(color => color.name),
          customizationOptions: variant.kind === 'custom_text'
            ? variant.customizationOptions.map(option => ({
                ...option,
                maxChars: Math.max(1, Number(option.maxChars) || 1),
                priceAdd: Math.max(0, Number(option.priceAdd) || 0),
              }))
            : [],
        }))
        .filter(variant => variant.colors.length > 0)
      const validVariantIds = new Set(normalizedVariants.map(v => v.id))
      const normalizedStlFiles = stlFiles
        .map(file => {
          const trimmedVariantId = file.variantId?.trim()
          return {
            url: file.url.trim(),
            name: file.name.trim() || file.url.split('/').pop()?.replace(/\.(stl|3mf)$/i, '') || 'STL file',
            notes: file.notes?.trim() || undefined,
            variantId: (trimmedVariantId && validVariantIds.has(trimmedVariantId)) ? trimmedVariantId : undefined,
          }
        })
        .filter(file => file.url)
      const stockQuantity = offeredColors.reduce((sum, color) => sum + color.stockQuantity, 0)
      const catalogId = catalogProduct?.id ?? draftCatalogId
      const inventoryId = inventory?.id ?? id()
      const now = new Date()

      await db.transact([
        linkCatalogRelations(db.tx.catalogProducts[catalogId].update({
          slug: cleanSlug,
          name: name.trim(),
          category: normalizeCategorySlug(category) || '',
          categorySlugs: productCategorySlugs,
          priceFrom: Number(priceFrom) || 0,
          priceTo: Number(priceTo) || Number(priceFrom) || 0,
          salePrice: salePrice.trim() ? Number(salePrice) || 0 : undefined,
          aspectRatio,
          benefit: benefit.trim(),
          description: description.trim(),
          image: primaryImage,
          images: finalImages,
          customizable,
          customizationOptions: customizable
            ? customizationOptions.map(option => ({
                ...option,
                maxChars: Math.max(1, Number(option.maxChars) || 1),
                priceAdd: Math.max(0, Number(option.priceAdd) || 0),
              }))
            : [],
          multiColor: false,
          multiColorCount: 1,
          colorSelectionMode: normalizedVariants.length ? 'preset_options' : 'single',
          multiColorPriceAdd: 0,
          variants: normalizedVariants,
          stlFiles: normalizedStlFiles,
          slicerNotes: slicerNotes.trim() || undefined,
          featured,
          featuredRank: Number(featuredRank) || 99,
          sortOrder: Number(sortOrder) || 99,
          isModular,
          materialGrams: recipe.reduce((sum, item) => sum + item.grams, 0),
          materialRecipe: recipe,
          productionJobTemplates,
          visible,
          updatedAt: now,
        }), categories, productCategorySlugs, inventoryId, getCatalogCategoryIds(catalogProduct), getCatalogPrimaryCategoryId(catalogProduct)),
        db.tx.productInventory[inventoryId].update({
          productSlug: cleanSlug,
          activeColorNames: offeredColors.map(color => color.colorName),
          colorInventory: normalizedColorInventory,
          stockQuantity,
          stockStatus: stockQuantity > 0 ? 'in_stock' : offeredColors.length > 0 ? 'made_to_order' : 'sold_out',
          leadTimeDays: Number(leadTimeDays) || 4,
          visible,
          allowCustomColorRequest,
          updatedAt: now,
        }).link({ product: catalogId }),
      ])

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        router.replace('/admin/products')
      }, 1000)
    } catch (err) {
      console.error('Product save failed:', err)
      setSaved(false)
      setError(err instanceof Error ? err.message : 'Product save failed. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyAI = (result: any, action: AIActionType, selectedFields: string[]) => {
    if (action === 'improvements' || action === 'marketing') {
      // Result can be an array (improvements) or object (marketing)
      const data = Array.isArray(result) ? result[0] : result;
      if (!data) return;

      if (selectedFields.includes('name') && data.title) setName(data.title);
      if (selectedFields.includes('description') && data.longDescription) setDescription(data.longDescription);
      if (selectedFields.includes('benefit') && data.benefit) setBenefit(data.benefit);
    } else if (action === 'generateImage' || action === 'remixImage') {
      if (typeof result === 'string') appendMediaUrl(result);
    }
  };

  const selectedCategorySlugs = normalizeCategorySlugs([category, categorySlugsText])
  const updateSelectedCategorySlugs = (slugs: string[]) => {
    const normalizedSlugs = normalizeCategorySlugs(slugs)
    setCategorySlugsText(normalizedSlugs.join(', '))
    if (!normalizedSlugs.includes(category)) {
      setCategory(normalizedSlugs[0] ?? '')
    }
  }

  const toggleCategorySlug = (slug: string, checked: boolean) => {
    const nextSlugs = checked
      ? [...selectedCategorySlugs, slug]
      : selectedCategorySlugs.filter(selectedSlug => selectedSlug !== slug)

    updateSelectedCategorySlugs(nextSlugs)
  }

  return (
    <main className="min-h-screen bg-secondary/30 pb-20">
      <header className="sticky top-0 z-[100] border-b border-border bg-background shadow-sm backdrop-blur-md transition-all">
        <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-foreground">{name || 'New product'}</h1>
              <div className="mt-1 flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary" />
                  Visible
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary" />
                  Featured
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex border-primary/20 hover:bg-primary/5 hover:border-primary/40"
              onClick={() => {
                setAiAction('improvements')
                setAiModalOpen(true)
              }}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
              AI Studio
            </Button>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="submit" form="product-editor-form" size="sm" disabled={isSaving} className="shadow-sm flex-1 sm:flex-initial">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground flex-1 sm:flex-initial"
                onClick={() => router.replace('/admin/products')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <form id="product-editor-form" onSubmit={handleSave}>
          {error && <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-background/50 p-1">
              <TabsTrigger value="marketing"><Package className="h-4 w-4" /><span className='ml-1 hidden sm:inline'>General</span></TabsTrigger>
              <TabsTrigger value="media"><ImageIcon className="h-4 w-4" /><span className='ml-1 hidden sm:inline'>Media</span></TabsTrigger>
              <TabsTrigger value="customization"><Settings className="h-4 w-4" /><span className='ml-1 hidden sm:inline'>Options</span></TabsTrigger>
              <TabsTrigger value="manufacturing"><Wrench className="h-4 w-4" /><span className='ml-1 hidden sm:inline'>Manufacturing</span></TabsTrigger>
            </TabsList>

            {/* Tab 1: General & Marketing */}
            <TabsContent value="marketing" className="space-y-6 border-none p-0 outline-none">
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-foreground">Basic Information</h2>
                  <p className="text-sm text-muted-foreground">The public-facing details for this product.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-4">
                  <div className="md:col-span-3">
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input id="product-name" value={name} onChange={event => setName(event.target.value)} required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="product-slug">Slug</Label>
                    <Input id="product-slug" value={productSlug} onChange={event => setProductSlug(slugify(event.target.value))} required className="mt-1.5" />
                  </div>
                  <div className="md:col-span-4">
                    <Label htmlFor="description">Long Description</Label>
                    <textarea 
                      id="description" 
                      value={description} 
                      onChange={event => setDescription(event.target.value)} 
                      rows={6} 
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="benefit">Key Benefit (Card Summary)</Label>
                    <Input id="benefit" value={benefit} onChange={event => setBenefit(event.target.value)} className="mt-1.5" />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Categories</Label>
                      {selectedCategorySlugs.length > 0 && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {selectedCategorySlugs.length} selected
                        </span>
                      )}
                    </div>
                    {categories.length === 0 ? (
                      <div className="mt-1.5 rounded-md border border-dashed border-border bg-secondary p-4 text-sm text-muted-foreground">
                        Create categories in the Categories tab before assigning this product.
                      </div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-2 rounded-md border border-border bg-secondary/60 p-2">
                        {categories.map(categoryOption => {
                          const selected = selectedCategorySlugs.includes(categoryOption.slug)
                          const primary = selected && selectedCategorySlugs[0] === categoryOption.slug

                          return (
                            <button
                              key={categoryOption.slug}
                              type="button"
                              onClick={() => toggleCategorySlug(categoryOption.slug, !selected)}
                              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                                  : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-background/80'
                              }`}
                            >
                              {selected ? <Check className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span>{categoryOption.label}</span>
                              {primary && (
                                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px] text-foreground">
                                  Primary
                                </Badge>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {selectedCategorySlugs.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Primary: {categories.find(categoryOption => categoryOption.slug === selectedCategorySlugs[0])?.label ?? selectedCategorySlugs[0]}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-foreground">Pricing & Logic</h2>
                  <p className="text-sm text-muted-foreground">Standard pricing and availability settings.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div>
                    <Label htmlFor="price-from">Base Price From (€)</Label>
                    <Input id="price-from" type="number" min="0" step="0.01" value={priceFrom} onChange={event => setPriceFrom(event.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="price-to">Base Price To (€)</Label>
                    <Input id="price-to" type="number" min="0" step="0.01" value={priceTo} onChange={event => setPriceTo(event.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="sale-price">Sale Price (€)</Label>
                    <Input id="sale-price" type="number" min="0" step="0.01" value={salePrice} onChange={event => setSalePrice(event.target.value)} placeholder="Optional" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="aspect-ratio">Crop Aspect Ratio</Label>
                    <Input id="aspect-ratio" value={aspectRatioText} onChange={event => setAspectRatioText(event.target.value)} placeholder="1:1, 4:5, 16:9" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lead-time">Manufacturing Lead Time (Days)</Label>
                    <Input id="lead-time" type="number" min="1" value={leadTimeDays} onChange={event => setLeadTimeDays(event.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="featured-rank">Catalog Rank</Label>
                    <Input id="featured-rank" type="number" min="1" value={featuredRank} onChange={event => setFeaturedRank(event.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="sort-order">Sort Order</Label>
                    <Input id="sort-order" type="number" min="1" value={sortOrder} onChange={event => setSortOrder(event.target.value)} className="mt-1.5" />
                  </div>
                  <label className="md:col-span-3 flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                    <input type="checkbox" checked={isModular} onChange={event => setIsModular(event.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary" />
                    <span>
                      <span className="block font-semibold text-foreground">Usar construtor modular</span>
                      <span className="mt-1 block text-muted-foreground">
                        Ativa o fluxo mobile-first por peças em /criar para lightboxes modulares.
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            </TabsContent>

            {/* Tab 2: Media */}
            <TabsContent value="media" className="space-y-6 border-none p-0 outline-none">
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Product Imagery</h2>
                    <p className="text-sm text-muted-foreground">Primary and gallery images for the storefront.</p>
                  </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.8fr)_1fr]">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="image">Primary Image URL</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input id="image" value={image} onChange={event => setImage(event.target.value)} placeholder="https://..." />
                        <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(image)} disabled={!image} title="Copy URL">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {image ? (
                      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-secondary/50">
                        <Image
                          src={previewImageUrl || image}
                          alt="Product preview"
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 40vw"
                          priority
                          unoptimized={image.startsWith('http')}
                        />
                        <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                          {previewImageUrl ? 'Selection Preview' : 'Current Primary'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-inner">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <Label className="flex items-center gap-2 font-bold text-primary">
                          <Sparkles className="h-4 w-4" />
                          {image ? 'Remix with AI' : 'Generate with AI'}
                        </Label>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40">
                          Appends to gallery
                        </span>
                      </div>
                      <div className="relative flex gap-2">
                        <Input
                          value={inlineRemixPrompt}
                          onChange={e => setInlineRemixPrompt(e.target.value)}
                          placeholder={image ? 'e.g. In a golf bag, different color...' : 'Describe your product...'}
                          className="h-11 border-primary/20 bg-background/40 pl-10 focus:border-primary/40"
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), image ? handleInlineRemix() : handleInlineGenerate())}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40">
                          <Wand2 className="h-4 w-4" />
                        </div>
                        <Button
                          type="button"
                          onClick={image ? handleInlineRemix : handleInlineGenerate}
                          disabled={isInlineRemixing || !inlineRemixPrompt}
                          className="h-11 px-6 shadow-lg shadow-primary/20"
                        >
                          {isInlineRemixing || isUploadingAiImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : image ? (
                            <Wand2 className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {(isInlineRemixing || isUploadingAiImage) && (
                        <div className="mt-3 flex items-center justify-center gap-3 border-t border-primary/10 py-2">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
                            {isUploadingAiImage ? 'Saving to Database...' : 'AI is creating your image...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-[1fr_auto_auto]">
                      <Input
                        value={manualMediaUrl}
                        onChange={event => setManualMediaUrl(event.target.value)}
                        placeholder="Paste image URL..."
                        onKeyDown={event => event.key === 'Enter' && (event.preventDefault(), handleAddManualMediaUrl())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddManualMediaUrl} disabled={!manualMediaUrl.trim()}>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Add URL
                      </Button>
                      <Button type="button" variant="outline" disabled={isUploadingMedia} asChild>
                        <label className="cursor-pointer">
                          {isUploadingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Upload
                          <input type="file" accept="image/*" className="sr-only" onChange={handleMediaUpload} />
                        </label>
                      </Button>
                    </div>

                    {mediaUrls.length === 0 ? (
                      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-center">
                        <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">No gallery images yet.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {mediaUrls.map((url, index) => (
                          <article key={`${url}-${index}`} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                            <button
                              type="button"
                              className="relative block aspect-square w-full overflow-hidden bg-secondary"
                              onClick={() => {
                                setPreviewImageUrl(url)
                                setImage(url)
                              }}
                            >
                              <img src={url} alt={`Product media ${index + 1}`} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                              {index === 0 && (
                                <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                                  Primary
                                </span>
                              )}
                            </button>
                            <div className="space-y-2 p-2">
                              <p className="truncate text-[11px] text-muted-foreground" title={url}>{url}</p>
                              <div className="grid grid-cols-5 gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-full" onClick={() => moveMediaUrl(index, -1)} disabled={index === 0} title="Move left">
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-full" onClick={() => moveMediaUrl(index, 1)} disabled={index === mediaUrls.length - 1} title="Move right">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-full" onClick={() => copyToClipboard(url)} title="Copy URL">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-full" onClick={() => setImage(url)} title="Use as primary">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-full text-destructive hover:bg-destructive/10" onClick={() => removeMediaUrl(url)} title="Remove">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* Tab 3: Options & Customization */}
            <TabsContent value="customization" className="space-y-6 border-none p-0 outline-none">
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-foreground">Configurable Options</h2>
                  <p className="text-sm text-muted-foreground">Enable custom text fields or multi-color support for the customer.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm text-foreground transition-colors hover:bg-secondary/50 cursor-pointer">
                    <input type="checkbox" checked={customizable} onChange={event => setCustomizable(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" /> 
                    Allow Customization
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm text-foreground transition-colors hover:bg-secondary/50 cursor-pointer">
                    <input type="checkbox" checked={allowCustomColorRequest} onChange={event => setAllowCustomColorRequest(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" /> 
                    Color on Request
                  </label>
                </div>

                {customizable && (
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Customization Fields</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => setCustomizationOptions(current => [...current, { type: 'initials', label: 'Initials', maxChars: '3', priceAdd: '3' }])}>
                        <Plus className="mr-2 h-4 w-4" /> Add Field
                      </Button>
                    </div>
                    {customizationOptions.length === 0 && <p className="text-sm text-muted-foreground italic">No fields defined. Customers won't see custom inputs.</p>}
                    <div className="space-y-3">
                      {customizationOptions.map((option, index) => (
                        <div key={index} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[140px_1fr_100px_100px_auto]">
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                            <select value={option.type} onChange={event => updateOption(index, { type: event.target.value as CustomizationOption['type'] })} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                              <option value="initials">Initials</option>
                              <option value="text">Short Text</option>
                              <option value="message">Long Message</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                            <Input value={option.label} onChange={event => updateOption(index, { label: event.target.value })} className="mt-1 h-9" />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Max Chars</Label>
                            <Input type="number" min="1" value={option.maxChars} onChange={event => updateOption(index, { maxChars: event.target.value })} className="mt-1 h-9" />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase text-muted-foreground">Add Price</Label>
                            <Input type="number" min="0" value={option.priceAdd} onChange={event => updateOption(index, { priceAdd: event.target.value })} className="mt-1 h-9" />
                          </div>
                          <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => setCustomizationOptions(current => current.filter((_, optionIndex) => optionIndex !== index))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Variantes do Produto</h2>
                    <p className="text-sm text-muted-foreground">Formato físico, preço, acabamentos, texto e partes de produção por variante.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setVariants(current => [...current, createDraftVariantOption(current.length, colors, 'single_color')])}>+ Variante</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {variants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 py-12 text-center">
                      <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">No variants defined.</p>
                      <p className="max-w-[240px] text-xs text-muted-foreground/60">Product will use fallback color mode from manufacturing tab.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {variants.map((variant, variantIndex) => (
                        <article key={variant.id} className="group relative rounded-xl border border-border bg-background p-5 shadow-sm transition-all hover:border-primary/30">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex -space-x-2">
                                {variant.colors.slice(0, 5).map((color, colorIndex) => (
                                  <span
                                    key={`${variant.id}-swatch-${colorIndex}`}
                                    className="h-8 w-8 rounded-full border-2 border-background shadow-md"
                                    style={{
                                      backgroundColor: color.hex ?? colors.find(item => item.name === color.name)?.hex ?? '#d1d5db',
                                      backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                    }}
                                  />
                                ))}
                              </div>
                              <div>
                                <h3 className="font-bold text-foreground">{variant.name || `Variante ${variantIndex + 1}`}</h3>
                                <Badge variant="secondary" className="mt-0.5 text-[10px] uppercase tracking-tight">{variant.aspectRatio?.join(':') ?? 'sem ratio'}</Badge>
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setVariants(current => current.filter(item => item.id !== variant.id))}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                            </Button>
                          </div>

                          <div className="rounded-lg border border-border/60 bg-secondary/15 p-4">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base</p>
                            <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_90px_90px_90px]">
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                              <Input value={variant.name} onChange={event => updateVariant(variant.id, { name: event.target.value })} className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Variant Image</Label>
                              <div className="mt-1 flex gap-2">
                                <Input
                                  value={variant.image ?? ''}
                                  onFocus={() => setPreviewImageUrl(variant.image ?? '')}
                                  onChange={event => {
                                    updateVariant(variant.id, { image: event.target.value })
                                    setPreviewImageUrl(event.target.value)
                                  }}
                                  className="h-9"
                                  placeholder="Optional URL..."
                                />
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setVariantPickerId(variant.id)} title="Choose from media">
                                  <ImageIcon className="h-4 w-4" />
                                </Button>
                                {variant.image && (
                                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => updateVariant(variant.id, { image: '' })} title="Clear image">
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Add €</Label>
                              <Input type="number" min="0" step="0.1" value={variant.priceAdd} onChange={event => updateVariant(variant.id, { priceAdd: event.target.value })} className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Fix €</Label>
                              <Input type="number" min="0" step="0.1" value={variant.finalPrice} onChange={event => updateVariant(variant.id, { finalPrice: event.target.value })} className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Stock</Label>
                              <Input type="number" min="0" value={variant.stockQuantity} onChange={event => updateVariant(variant.id, { stockQuantity: event.target.value })} className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Print Min</Label>
                              <Input type="number" min="0" value={variant.estimatedPrintMinutes} onChange={event => updateVariant(variant.id, { estimatedPrintMinutes: event.target.value })} className="mt-1 h-9" placeholder="mins" />
                            </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/15 p-4">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Formato</p>
                            <div className="grid gap-4 md:grid-cols-[120px_1fr_1.5fr_120px]">
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Ratio</Label>
                                <Input
                                  value={variant.aspectRatio?.join(':') ?? ''}
                                  onChange={event => {
                                    const [width, height] = event.target.value.split(':').map(value => Number(value.trim()))
                                    updateVariant(variant.id, { aspectRatio: width > 0 && height > 0 ? [width, height] : undefined })
                                  }}
                                  className="mt-1 h-9"
                                  placeholder="1:1"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Crop Label</Label>
                                <Input value={variant.formatLabel ?? ''} onChange={event => updateVariant(variant.id, { formatLabel: event.target.value })} className="mt-1 h-9" placeholder="Formato Quadrado · crop 1:1" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Upload Guidance</Label>
                                <Input value={variant.uploadGuidance ?? ''} onChange={event => updateVariant(variant.id, { uploadGuidance: event.target.value })} className="mt-1 h-9" placeholder="Ideal para retratos..." />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Tipo</Label>
                                <Input value={variant.variantType ?? ''} onChange={event => updateVariant(variant.id, { variantType: event.target.value })} className="mt-1 h-9" placeholder="led" />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/15 p-4">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Texto no Preview</p>
                            <div className="grid gap-4 md:grid-cols-6">
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Left %</Label>
                                <Input type="number" value={variant.textOverlay?.left ?? ''} onChange={event => updateVariant(variant.id, { textOverlay: { ...(variant.textOverlay ?? {}), left: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 h-9" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Bottom %</Label>
                                <Input type="number" value={variant.textOverlay?.bottom ?? ''} onChange={event => updateVariant(variant.id, { textOverlay: { ...(variant.textOverlay ?? {}), bottom: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 h-9" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Width %</Label>
                                <Input type="number" value={variant.textOverlay?.width ?? ''} onChange={event => updateVariant(variant.id, { textOverlay: { ...(variant.textOverlay ?? {}), width: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 h-9" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Align</Label>
                                <select
                                  value={variant.textOverlay?.align ?? 'center'}
                                  onChange={event => updateVariant(variant.id, { textOverlay: { ...(variant.textOverlay ?? {}), align: event.target.value as 'left' | 'center' | 'right' } })}
                                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Font px</Label>
                                <Input type="number" value={variant.textOverlay?.fontSize ?? ''} onChange={event => updateVariant(variant.id, { textOverlay: { ...(variant.textOverlay ?? {}), fontSize: event.target.value === '' ? undefined : Number(event.target.value) } })} className="mt-1 h-9" />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Color</Label>
                                <Input value={variant.textOverlay?.color ?? ''} onChange={event => updateVariant(variant.id, { textOverlay: { ...(variant.textOverlay ?? {}), color: event.target.value } })} className="mt-1 h-9" placeholder="#ffffff" />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-border/50 pt-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Colors</p>
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => addColorToVariant(variant.id)}>
                                + Add Color
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              {variant.colors.map((color, colorIndex) => (
                                <div key={`${variant.id}-color-${colorIndex}`} className="space-y-2 rounded-lg bg-secondary/30 p-2 border border-border/50">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-6 w-6 rounded-full border border-border shadow-sm"
                                      style={{
                                        backgroundColor: color.hex ?? colors.find(item => item.name === color.name)?.hex ?? '#d1d5db',
                                        backgroundImage: color.imageUrl ? `url(${color.imageUrl})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                      }}
                                    />
                                    <select
                                      value={color.name}
                                      onChange={event => updateVariantColor(variant.id, colorIndex, event.target.value)}
                                      className="h-7 min-w-0 flex-1 bg-transparent text-[11px] font-medium outline-none"
                                    >
                                      {colors.map(globalColor => (
                                        <option key={globalColor.name} value={globalColor.name}>{globalColor.name}</option>
                                      ))}
                                    </select>
                                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => updateVariant(variant.id, { colors: variant.colors.filter((_, index) => index !== colorIndex) })}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <Input
                                    value={color.imageUrl ?? ''}
                                    onChange={event => updateVariantColorImage(variant.id, colorIndex, event.target.value)}
                                    className="h-7 text-[11px]"
                                    placeholder="Texture image URL"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {variant.kind === 'custom_text' && (
                            <div className="mt-4 border-t border-border/50 pt-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customization Fields</p>
                                <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => addVariantCustomization(variant.id)}>
                                  + Add Field
                                </Button>
                              </div>
                              {variant.customizationOptions.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No customization fields defined.</p>
                              ) : (
                                <div className="space-y-2">
                                  {variant.customizationOptions.map((option, optionIndex) => (
                                    <div key={`${variant.id}-customization-${optionIndex}`} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[120px_1fr_80px_80px_auto]">
                                      <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                                        <select
                                          value={option.type}
                                          onChange={event => updateVariantCustomization(variant.id, optionIndex, { type: event.target.value as CustomizationOption['type'] })}
                                          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                                        >
                                          <option value="initials">Initials</option>
                                          <option value="text">Short Text</option>
                                          <option value="message">Long Message</option>
                                        </select>
                                      </div>
                                      <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                                        <Input value={option.label} onChange={event => updateVariantCustomization(variant.id, optionIndex, { label: event.target.value })} className="mt-1 h-8" />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground">Max</Label>
                                        <Input type="number" min="1" value={option.maxChars} onChange={event => updateVariantCustomization(variant.id, optionIndex, { maxChars: event.target.value })} className="mt-1 h-8" />
                                      </div>
                                      <div>
                                        <Label className="text-[10px] uppercase text-muted-foreground">+€</Label>
                                        <Input type="number" min="0" value={option.priceAdd} onChange={event => updateVariantCustomization(variant.id, optionIndex, { priceAdd: event.target.value })} className="mt-1 h-8" />
                                      </div>
                                      <div className="flex items-end">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeVariantCustomization(variant.id, optionIndex)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-4 border-t border-border/50 pt-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Partes de Produção</p>
                                <p className="text-xs text-muted-foreground">
                                  {variant.parts.length ? 'Override desta variante.' : 'Sem override: usa a receita default do produto.'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => useDefaultRecipeForVariant(variant.id)}>
                                  Usar default
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => addVariantPart(variant.id)}>
                                  + Parte
                                </Button>
                              </div>
                            </div>
                            {variant.parts.length > 0 && (
                              <div className="space-y-2">
                                {variant.parts.map((part, partIndex) => (
                                  <div key={`${variant.id}-part-${partIndex}`} className="grid gap-2 rounded-lg border border-border bg-secondary/20 p-3 md:grid-cols-[1fr_90px_110px_120px_90px_auto]">
                                    <div>
                                      <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                                      <Input value={part.label} onChange={event => updateVariantPart(variant.id, partIndex, { label: event.target.value })} className="mt-1 h-8" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] uppercase text-muted-foreground">Grams</Label>
                                      <Input type="number" min="1" value={part.grams} onChange={event => updateVariantPart(variant.id, partIndex, { grams: event.target.value })} className="mt-1 h-8" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] uppercase text-muted-foreground">Material</Label>
                                      <select value={part.materialType ?? 'PLA'} onChange={event => updateVariantPart(variant.id, partIndex, { materialType: event.target.value as DraftVariantPart['materialType'] })} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                                        <option value="PLA">PLA</option>
                                        <option value="PETG">PETG</option>
                                        <option value="ABS">ABS</option>
                                        <option value="TPU">TPU</option>
                                      </select>
                                    </div>
                                    <div>
                                      <Label className="text-[10px] uppercase text-muted-foreground">Color Source</Label>
                                      <select value={part.colorSource ?? 'partColor'} onChange={event => updateVariantPart(variant.id, partIndex, { colorSource: event.target.value as DraftVariantPart['colorSource'] })} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                                        <option value="variantColor">Variant</option>
                                        <option value="partColor">Part</option>
                                        <option value="lithophane">Lithophane</option>
                                        <option value="none">None</option>
                                      </select>
                                    </div>
                                    <label className="flex items-end gap-2 pb-2 text-xs text-muted-foreground">
                                      <input type="checkbox" checked={Boolean(part.requiresLithophaneProcessing)} onChange={event => updateVariantPart(variant.id, partIndex, { requiresLithophaneProcessing: event.target.checked })} />
                                      Litho
                                    </label>
                                    <div className="flex items-end">
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateVariant(variant.id, { parts: variant.parts.filter((_, index) => index !== partIndex) })}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </TabsContent>

            {/* Tab 4: Manufacturing */}
            <TabsContent value="manufacturing" className="space-y-6 border-none p-0 outline-none">
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-foreground">Manufacturing Config</h2>
                  <p className="text-sm text-muted-foreground">Workshop details that don't affect the marketing copy.</p>
                </div>
                <p className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                  As variantes e as respetivas partes são agora configuradas nos cards de variante. Esta tab fica como fallback global de produção.
                </p>
              </section>

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Print Files</h3>
                    <p className="text-xs text-muted-foreground">STLs and slicer instructions used by the production queue.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isGeneratingStl}
                      onClick={() => setShowGenerateStlDialog(true)}
                    >
                      {isGeneratingStl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Gerar STL de Imagem
                    </Button>
                    <input
                      id="stl-upload"
                      type="file"
                      accept=".stl,model/stl,.3mf,model/3mf"
                      className="hidden"
                      onChange={handleStlUpload}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={isUploadingStl} onClick={() => document.getElementById('stl-upload')?.click()}>
                      {isUploadingStl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload STL
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="slicer-notes">Slicer Notes</Label>
                    <textarea
                      id="slicer-notes"
                      value={slicerNotes}
                      onChange={event => setSlicerNotes(event.target.value)}
                      placeholder="Supports, scale, orientation, brim, quality profile..."
                      className="mt-1.5 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  {stlFiles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-secondary/20 py-10 text-center">
                      <Package className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">No STL files uploaded.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {stlFiles.map((file, fileIndex) => (
                        <div key={`${file.url}-${fileIndex}`} className="rounded-xl border border-border bg-secondary/20 p-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] uppercase text-muted-foreground">File Name</Label>
                                {file.source === 'tripo3d' && (
                                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                    <Wand2 className="mr-1 h-2.5 w-2.5" />
                                    Tripo3D
                                  </Badge>
                                )}
                              </div>
                              <Input value={file.name} onChange={event => updateStlFile(fileIndex, { name: event.target.value })} className="mt-1 h-9" />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Variant</Label>
                              <select
                                value={file.variantId ?? ''}
                                onChange={event => updateStlFile(fileIndex, { variantId: event.target.value })}
                                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                              >
                                <option value="">All variants</option>
                                {variants.map(variant => (
                                  <option key={variant.id} value={variant.id}>{variant.name || variant.id}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end gap-1">
                              <Button type="button" variant="outline" size="icon" className="h-9 w-9" asChild title="Download STL">
                                <a href={file.url} target="_blank" rel="noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setStlFiles(current => current.filter((_, index) => index !== fileIndex))} title="Remove STL">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Label className="text-[10px] uppercase text-muted-foreground">File Notes</Label>
                            <Input value={file.notes ?? ''} onChange={event => updateStlFile(fileIndex, { notes: event.target.value })} className="mt-1 h-9" placeholder="Optional file-specific instruction..." />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Material Recipe</h3>
                      <p className="text-xs text-muted-foreground">Parts used for 3D printing and cost calculation.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMaterialRecipe(current => [...current, { label: `Part ${current.length + 1}`, grams: '10' }])}>
                      + Add Part
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {materialRecipe.map((item, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border border-border bg-secondary/20 p-3 md:grid-cols-[1fr_100px_auto]">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Part Label</Label>
                          <Input value={item.label} onChange={event => updateRecipe(index, { label: event.target.value })} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Weight (g)</Label>
                          <Input type="number" min="1" value={item.grams} onChange={event => updateRecipe(index, { grams: event.target.value })} className="h-9" />
                        </div>
                        <div className="flex items-end">
                          <Button type="button" variant="ghost" size="icon" disabled={materialRecipe.length === 1} className="h-9 w-9 text-destructive" onClick={() => setMaterialRecipe(current => current.filter((_, itemIndex) => itemIndex !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">Production Job Templates</h3>
                        <p className="text-xs text-muted-foreground">Define jobs created when order requests are approved.</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">JSON</Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold">colorSource:</span>{' '}
                      <code className="rounded bg-secondary px-1">baseColor</code> (uses customer's color),{' '}
                      <code className="rounded bg-secondary px-1">lithophane</code> → Branco,{' '}
                      <code className="rounded bg-secondary px-1">none</code> → Branco
                    </p>
                  </div>
                  <div className="space-y-3">
                    <textarea
                      value={productionJobTemplatesJson}
                      onChange={event => setProductionJobTemplatesJson(event.target.value)}
                      rows={12}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed focus:border-primary outline-none"
                      placeholder='[{ "partLabel": "Moldura", "colorSource": "baseColor", "materialGrams": 60, "materialType": "PLA" }]'
                    />
                    {(() => {
                      try {
                        const parsed = JSON.parse(productionJobTemplatesJson)
                        if (!Array.isArray(parsed)) return <p className="text-[11px] text-destructive">Must be an array</p>
                        return (
                          <div className="space-y-1">
                            {parsed.map((t: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                <span className="font-medium">{i + 1}.</span>
                                <span>{t.partLabel || 'Unnamed'}</span>
                                <Badge variant="secondary" className="h-4 px-1 text-[9px]">{t.colorSource}</Badge>
                                <span className="text-muted-foreground">{t.materialGrams}g</span>
                                {t.requiresLithophaneProcessing && (
                                  <Badge variant="outline" className="h-4 px-1 text-[9px] border-amber-300 bg-amber-50 text-amber-700" title="Requires manual STL generation (ItsLitho)">
                                    ⚠️ Lithophane
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      } catch {
                        return <p className="text-[11px] text-destructive">Invalid JSON</p>
                      }
                    })()}
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-foreground">Inventory Levels</h3>
                    <p className="text-xs text-muted-foreground">Stock per individual filament color.</p>
                  </div>
                  <div className="max-h-[500px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                    {colorInventory.map(color => (
                      <div key={color.colorName} className={`flex items-center justify-between rounded-lg border border-border p-3 transition-colors ${color.offered ? 'bg-background' : 'bg-secondary/20 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-full border border-border shadow-sm" style={{ backgroundColor: color.colorHex }} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{color.colorName}</p>
                            <p className="text-[10px] text-muted-foreground">{color.gramsAvailable}g left in spool</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <Label className="text-[10px] uppercase text-muted-foreground mb-1">Stock</Label>
                            <Input 
                              type="number" 
                              min="0" 
                              value={color.stockQuantity} 
                              onChange={e => updateColor(color.colorName, { stockQuantity: e.target.value })} 
                              className="h-8 w-16 text-center text-xs" 
                              disabled={!color.offered}
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <Label className="text-[10px] uppercase text-muted-foreground mb-1">Live</Label>
                            <input 
                              type="checkbox" 
                              checked={color.offered} 
                              onChange={e => updateColor(color.colorName, { offered: e.target.checked })} 
                              className="h-4 w-4 rounded border-gray-300 text-primary"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </div>

      <Dialog open={Boolean(variantPickerId)} onOpenChange={open => !open && setVariantPickerId(null)}>
        <DialogContent className="max-h-[82vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Variant Image</DialogTitle>
          </DialogHeader>
          {mediaUrls.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/20">
              <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No product media available.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {mediaUrls.map((url, index) => (
                <button
                  key={`${url}-picker-${index}`}
                  type="button"
                  className="overflow-hidden rounded-lg border border-border bg-background text-left shadow-sm transition hover:border-primary"
                  onClick={() => {
                    if (variantPickerId) {
                      updateVariant(variantPickerId, { image: url })
                      setPreviewImageUrl(url)
                    }
                    setVariantPickerId(null)
                  }}
                >
                  <span className="relative block aspect-square bg-secondary">
                    <img src={url} alt={`Variant option ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Primary
                      </span>
                    )}
                  </span>
                  <span className="block truncate p-2 text-xs text-muted-foreground">{url}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIProductModal 
        open={isAiModalOpen} 
        onOpenChange={setAiModalOpen}
        product={product}
        onApplyResult={handleApplyAI}
      />

      <Dialog open={showGenerateStlDialog} onOpenChange={setShowGenerateStlDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar STL de Imagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="stl-image-url">Image URL</Label>
              <Input
                id="stl-image-url"
                placeholder="https://example.com/image.jpg"
                value={generateStlImageUrl}
                onChange={e => setGenerateStlImageUrl(e.target.value)}
                disabled={isGeneratingStl}
                className="mt-1.5"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Enter the URL of the image to convert to a 3D model.
              </p>
            </div>
            <div>
              <Label htmlFor="stl-variant">Variant (optional)</Label>
              <select
                id="stl-variant"
                value={generateStlVariantId}
                onChange={e => setGenerateStlVariantId(e.target.value)}
                disabled={isGeneratingStl}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">All variants</option>
                {variants.map(variant => (
                  <option key={variant.id} value={variant.id}>{variant.name || variant.id}</option>
                ))}
              </select>
            </div>
            {isGeneratingStl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating 3D model... This may take 1-3 minutes.</span>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={handleGenerateStlFromImage}
                disabled={isGeneratingStl || !generateStlImageUrl.trim()}
                className="flex-1"
              >
                {isGeneratingStl ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {isGeneratingStl ? 'Generating...' : 'Generate STL'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGenerateStlDialog(false)}
                disabled={isGeneratingStl}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
