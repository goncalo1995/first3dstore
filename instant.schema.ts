// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    globalColors: i.entity({
      name: i.string().unique().indexed(),
      hex: i.string(),
      gramsAvailable: i.number(),
      spoolStatus: i.string<'available' | 'low' | 'archived'>(),
      supplierUrl: i.string().optional(),
      pricePerKg: i.number().optional(),
      notes: i.string().optional(),
      productId: i.string().indexed().optional(), // Scoped to specific product
      isGlobal: i.boolean().optional(), // Usable across all products
      isActive: i.boolean().indexed(), // Soft-delete for storefront
      updatedAt: i.date(),
    }),
    spools: i.entity({
      colorId: i.string().indexed(),
      gramsRemaining: i.number(),
      materialType: i.string<'PLA' | 'PETG' | 'ABS' | 'TPU'>(),
      brand: i.string().optional(),
      purchasePrice: i.number().optional(),
      vendorUrl: i.string().optional(),
      purchaseDate: i.date().optional(),
      notes: i.string().optional(),
      isActive: i.boolean().indexed(),
      isInbound: i.boolean().optional(),
      expectedDeliveryDate: i.date().optional(),
      updatedAt: i.date(),
    }),
    printers: i.entity({
      name: i.string(),
      status: i.string<'idle' | 'printing' | 'maintenance'>().indexed(),
      buildVolume: i.json<{ x: number; y: number; z: number }>(),
      activeJobIds: i.json<string[]>().optional(),
      updatedAt: i.date(),
    }),
    printerSlots: i.entity({
      printerId: i.string().indexed(),
      slotNumber: i.number(),
    }),
    printHistory: i.entity({
      printerId: i.string().indexed(),
      jobId: i.string().indexed(),
      startedAt: i.date().indexed(),
      completedAt: i.date().indexed(),
      spoolsUsed: i.json<{ slotNumber: number; spoolId: string; gramsUsed: number }[]>(),
    }),
    scheduledJobs: i.entity({
      jobId: i.string().indexed(),
      scheduledDate: i.date().indexed(),
      printerId: i.string().optional().indexed(),
      confirmed: i.boolean().indexed(),
    }),
    productCategories: i.entity({
      slug: i.string().unique().indexed(),
      label: i.string(),
      description: i.string().optional(),
      sortOrder: i.number(),
      visible: i.boolean(),
      updatedAt: i.date(),
    }),
    catalogProducts: i.entity({
      slug: i.string().unique().indexed(),
      name: i.string(),
      category: i.string(),
      categorySlugs: i.json<string[]>().optional(),
      priceFrom: i.number(),
      priceTo: i.number(),
      salePrice: i.number().optional(),
      aspectRatio: i.json<[number, number]>().optional(),
      benefit: i.string(),
      description: i.string(),
      image: i.string(),
      images: i.json<string[]>(),
      customizable: i.boolean(),
      customizationOptions: i.json<{
        type: 'initials' | 'text' | 'message'
        label: string
        maxChars: number
        priceAdd: number
      }[]>(),
      multiColor: i.boolean(),
      multiColorCount: i.number(),
      isModular: i.boolean().indexed().optional(),
      colorSelectionMode: i.string<'single' | 'flexible_parts' | 'preset_options'>().optional(),
      multiColorPriceAdd: i.number().optional(),
      variants: i.json<{
        id: string
        name: string
        kind: 'single_color' | 'preset_pack' | 'custom_text'
        image?: string
        priceAdd?: number
        finalPrice?: number
        stockQuantity?: number
        aspectRatio?: [number, number]
        formatLabel?: string
        uploadGuidance?: string
        variantType?: 'led' | 'candle' | 'bulb' | string
        requiresPartColorSelection?: boolean
        textOverlay?: {
          x?: number
          y?: number
          bottom?: number
          left?: number
          width?: number
          align?: 'left' | 'center' | 'right'
          fontSize?: number
          color?: string
        }
        colors: {
          name: string
          hex: string
          imageUrl?: string
          globalColorId?: string
        }[]
        parts?: {
          label: string
          grams: number
          materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
          colorSource?: 'variantColor' | 'partColor' | 'lithophane' | 'none'
          requiresLithophaneProcessing?: boolean
        }[]
        customizationOptions?: {
          type: 'initials' | 'text' | 'message'
          label: string
          maxChars: number
          priceAdd: number
        }[]
      }[]>().optional(),
      stlFiles: i.json<{
        url: string
        name: string
        notes?: string
        variantId?: string
        boundingBox?: { x: number; y: number; z: number }
        estimatedPrintMinutes?: number
        source?: 'upload' | 'tripo3d'
      }[]>().optional(),
      slicerNotes: i.string().optional(),
      featured: i.boolean().indexed(),
      featuredRank: i.number().indexed(),
      sortOrder: i.number().optional(),
      materialGrams: i.number().optional(),
      materialRecipe: i.json<{
        label: string
        grams: number
        materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
        colorSource?: 'variantColor' | 'partColor' | 'lithophane' | 'none'
        requiresLithophaneProcessing?: boolean
      }[]>().optional(),
      productionJobTemplates: i.json<{
        partLabel: string
        colorSource: 'baseColor' | 'none' | 'lithophane'
        materialGrams: number
        materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
        requiresLithophaneProcessing?: boolean
      }[]>().optional(),
      visible: i.boolean().indexed(),
      updatedAt: i.date(),
    }),
    marketingPosts: i.entity({
      platform: i.string<'instagram'>().indexed(),
      contentType: i.string<'post' | 'story' | 'reel'>().indexed(),
      status: i.string<'draft' | 'scheduled' | 'published' | 'archived'>().indexed(),
      userId: i.string().indexed(),
      title: i.string(),
      caption: i.string(),
      hashtags: i.json<string[]>(),
      callToAction: i.string().optional(),
      firstComment: i.string().optional(),
      storyHighlightCategory: i.string().optional(),
      mediaUrls: i.json<string[]>(),
      productIds: i.json<string[]>(),
      isCarousel: i.boolean(),
      slideCrops: i.json<{
        slideIndex: number
        profile?: {
          x: number
          y: number
          zoom?: number
        }
        feed?: {
          x: number
          y: number
          zoom?: number
        }
        story?: {
          x: number
          y: number
          zoom?: number
        }
      }[]>().optional(),
      thumbnailCrop: i.json<{
        x: number
        y: number
        zoom?: number
        slideIndex?: number
      }>().optional(),
      scheduledAt: i.date().indexed().optional(),
      timezone: i.string(),
      reminderOffsetHours: i.number(),
      reminderSent: i.boolean().indexed(),
      reminderSentAt: i.date().optional(),
      postedAt: i.date().indexed().optional(),
      metrics: i.json<{
        likes?: number
        comments?: number
        shares?: number
        saves?: number
        reach?: number
      }>().optional(),
      createdAt: i.date(),
      updatedAt: i.date().indexed(),
    }),
    storyCategories: i.entity({
      name: i.string(),
      userId: i.string().indexed(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    orders: i.entity({
      customerName: i.string(),
      customerEmail: i.string().optional(),
      customerPhone: i.string().optional(),
      paymentPreference: i.string<'mbway' | 'bank_transfer' | 'cash_pickup' | 'other'>(),
      shippingMethod: i.string<'pickup_carcavelos' | 'mainland_portugal'>(),
      shippingAddress: i.string().optional(),
      items: i.json<{
        productId?: string
        productName: string
        quantity: number
        colors: string[]
        selectedVariant?: {
          id?: string
          name: string
          kind?: 'single_color' | 'preset_pack' | 'custom_text'
          colors: string[]
        }
        customText?: string
        unitPrice: number
        itemStatus?: 'new' | 'waiting_color' | 'scheduled' | 'printing' | 'printed' | 'assembled' | 'done' | 'blocked'
        adminNotes?: string
        scheduledFor?: string
        quantityDone?: number
      }[]>(),
      subtotal: i.number(),
      shippingCost: i.number(),
      total: i.number(),
      paymentStatus: i.string<'pending' | 'paid' | 'refunded'>(),
      fulfillmentStatus: i.string<'new' | 'printing' | 'ready' | 'shipped' | 'completed' | 'cancelled'>(),
      notes: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    orderRequests: i.entity({
      customerName: i.string(),
      customerEmail: i.string().indexed(),
      customerPhone: i.string().optional(),
      imageUrl: i.string().optional(),
      companyName: i.string().optional(),
      baseColor: i.string<'black' | 'wood'>().optional(),
      productType: i.string<'hexa-memoria'>().optional(),
      productSlug: i.string().indexed().optional(),
      productName: i.string().optional(),
      stlUrl: i.string().optional(),
      svgUrl: i.string().optional(),
      previewUrl: i.string().optional(),
      paymentUrl: i.string().optional(),
      estimatedPrice: i.number().optional(),
      quotedPrice: i.number().optional(),
      variantId: i.string().optional(),
      variantName: i.string().optional(),
      selectedPrice: i.number().optional(),
      lightMode: i.string<'desligada' | 'quente' | 'fria'>().optional(),
      canvasConfig: i.json<{
        version: number
        type: 'simple' | 'modular-list' | 'photo-puzzle' | 'svg-puzzle' | 'wall-forge' | 'hexa-memoria'
        [key: string]: any
      }>().optional(),
      engravingText: i.string().optional(),
      leadType: i.string<'photo_request' | 'b2b'>().optional(),
      isPaid: i.boolean().optional(),
      notes: i.string().optional(),
      status: i.string<'PENDING_REVIEW' | 'MODELING' | 'AWAITING_PAYMENT' | 'READY_FOR_PRODUCTION' | 'IN_PRODUCTION' | 'SHIPPED' | 'B2B_LEAD'>().indexed(),
      createdAt: i.date().indexed(),
      updatedAt: i.date(),
    }),
    stripeWebhookEvents: i.entity({
      eventId: i.string().unique().indexed(),
      type: i.string().indexed(),
      orderRequestId: i.string().indexed().optional(),
      processedAt: i.date().indexed(),
    }),
    productInventory: i.entity({
      productSlug: i.string().unique().indexed(),
      activeColorNames: i.json<string[]>(),
      colorInventory: i.json<{
        colorName: string
        colorHex: string
        offered: boolean
        stockQuantity: number
        gramsAvailable: number
      }[]>(),
      stockQuantity: i.number(),
      stockStatus: i.string<'in_stock' | 'made_to_order' | 'sold_out'>(),
      leadTimeDays: i.number(),
      visible: i.boolean(),
      allowCustomColorRequest: i.boolean(),
      updatedAt: i.date(),
    }),
    aiUsageLogs: i.entity({
      feature: i.string().indexed(),
      model: i.string().indexed(),
      promptTokens: i.number(),
      completionTokens: i.number(),
      totalTokens: i.number(),
      estimatedCost: i.number(),
      requestId: i.string(),
      success: i.boolean().indexed(),
      errorMessage: i.string().optional(),
      createdAt: i.date().indexed(),
      userId: i.string().indexed(),
    }),
    productionJobs: i.entity({
      orderId: i.string().indexed().optional(),
      orderRequestId: i.string().indexed().optional(),
      orderItemIndex: i.number().optional(),
      productId: i.string().indexed().optional(),
      productSlug: i.string().indexed().optional(),
      selectedVariantId: i.string().optional(),
      selectedVariantName: i.string().optional(),
      productName: i.string(),
      imageUrl: i.string().optional(),
      source: i.string<'order' | 'order_request'>().optional(),
      partLabel: i.string(),
      colorName: i.string().indexed(),
      colorHex: i.string(),
      materialGrams: i.number(),
      materialType: i.string<'PLA' | 'PETG' | 'ABS' | 'TPU'>().optional(),
      quantity: i.number(),
      status: i.string<'queued' | 'printing' | 'printed' | 'assembled' | 'failed' | 'cancelled'>().indexed(),
      isMultiColor: i.boolean().optional(),
      colorRequirements: i.json<{
        colorId: string
        colorName?: string
        colorHex?: string
        grams: number
        materialType?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
        slotPreference?: number
      }[]>().optional(),
      requiredColorIds: i.string().indexed().optional(), // Comma-separated
      totalGrams: i.number().optional(),
      estimatedPrintMinutes: i.number().optional(),
      priority: i.number().indexed().optional(),
      printerId: i.string().indexed().optional(),
      scheduledDate: i.date().indexed().optional(),
      positionInQueue: i.number().optional(),
      startedAt: i.date().optional(),
      completedAt: i.date().optional(),
      assignedSpoolIds: i.json<string[]>().optional(),
      spoolAllocations: i.json<{
        requirementKey: string
        spoolId: string
        slotNumber: number
        expectedGrams: number
        colorId: string
        materialType: 'PLA' | 'PETG' | 'ABS' | 'TPU'
        suggestedMaterialType: 'PLA' | 'PETG' | 'ABS' | 'TPU'
      }[]>().optional(),
      outsourced: i.boolean().indexed(),
      assignedFarmId: i.string().indexed().optional(),
      customText: i.string().optional(),
      notes: i.string().optional(),
      createdAt: i.date().indexed(),
      updatedAt: i.date(),
    }),
    printFarms: i.entity({
      name: i.string().unique().indexed(),
      contactEmail: i.string().optional(),
      website: i.string().optional(),
      colorsOffered: i.json<{ colorId: string; priceOverride?: number }[]>(),
      notes: i.string().optional(),
      updatedAt: i.date(),
    }),
  },
  links: {
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade",
      },
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    catalogProductPrimaryCategory: {
      forward: {
        on: "catalogProducts",
        has: "one",
        label: "primaryCategory",
      },
      reverse: {
        on: "productCategories",
        has: "many",
        label: "primaryProducts",
      },
    },
    catalogProductCategories: {
      forward: {
        on: "catalogProducts",
        has: "many",
        label: "categories",
      },
      reverse: {
        on: "productCategories",
        has: "many",
        label: "products",
      },
    },
    catalogProductInventory: {
      forward: {
        on: "catalogProducts",
        has: "one",
        label: "inventory",
      },
      reverse: {
        on: "productInventory",
        has: "one",
        label: "product",
      },
    },
    marketingPostProduct: {
      forward: {
        on: "marketingPosts",
        has: "one",
        label: "product",
      },
      reverse: {
        on: "catalogProducts",
        has: "many",
        label: "marketingPosts",
      },
    },
    productionJobOrder: {
      forward: {
        on: "productionJobs",
        has: "one",
        label: "order",
      },
      reverse: {
        on: "orders",
        has: "many",
        label: "productionJobs",
      },
    },
    productionJobColor: {
      forward: { on: "productionJobs", has: "one", label: "globalColor" },
      reverse: { on: "globalColors", has: "many", label: "productionJobs" },
    },
    spoolColor: {
      forward: { on: "spools", has: "one", label: "color" },
      reverse: { on: "globalColors", has: "many", label: "spools" },
    },
    printerSlotPrinter: {
      forward: { on: "printerSlots", has: "one", label: "printer" },
      reverse: { on: "printers", has: "many", label: "slots" },
    },
    printerSlotSpool: {
      forward: { on: "printerSlots", has: "one", label: "spool" },
      reverse: { on: "spools", has: "many", label: "slots" },
    },
    printerSlotColor: {
      forward: { on: "printerSlots", has: "one", label: "color" },
      reverse: { on: "globalColors", has: "many", label: "slots" },
    },
    jobScheduled: {
      forward: { on: "scheduledJobs", has: "one", label: "job" },
      reverse: { on: "productionJobs", has: "one", label: "schedule" },
    },
    printHistoryPrinter: {
      forward: { on: "printHistory", has: "one", label: "printer" },
      reverse: { on: "printers", has: "many", label: "history" },
    },
    printHistoryJob: {
      forward: { on: "printHistory", has: "one", label: "job" },
      reverse: { on: "productionJobs", has: "many", label: "history" },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
