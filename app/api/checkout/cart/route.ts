import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { dbAdmin, id } from '@/lib/db-admin'
import { getCatalogProductBySlugForBuild } from '@/lib/catalog'
import type { CartItemPartColor, CartItemVariant } from '@/lib/cart-context'
import {
  CHARS_PER_MODULE_ESTIMATE,
  LAUNCH_DISCOUNT_PERCENT,
  MAX_GLOBAL_MODULES,
  MIN_GLOBAL_MODULES,
  MODULE_LENGTH_CM,
  calculateMenuQuote,
  validateMenuQuoteLimits,
  type MenuQuote,
  type MenuRowInput,
} from '@/lib/menu-calculator'
import {
  PHYSICAL_GRID_DIMENSION_SET,
  extraLetterGroupsToText,
  flattenTextRowsFromWalls,
  getGridBom,
  getWallsBom,
  physicalGridToMenuRows,
  type CheckoutLane,
  type ExtraLetterGroup,
  type FontStyle,
  type PhysicalRow,
  type PhysicalWall,
} from '@/lib/modular-physical-grid'
import {
  EXTRA_LETTER_PACKS,
  type ExtraLetterPackSelection,
} from '@/lib/modular-inventory-config'
import type { GlobalColor, Product, ProductColor } from '@/lib/products'

export const runtime = 'nodejs'

const SHIPPING_COST = 4.99
const MAX_ITEMS = 30
const MAX_QUANTITY = 99
const MAX_MENU_QUANTITY = 2000
const MENU_RAIL_SLUG = 'menu-rail-25cm'
const MENU_PACK_SLUG = 'menu-letter-pack-standard'
const MENU_AVULSO_SLUG = 'menu-letter-custom'
const MENU_PRODUCT_SLUGS = [MENU_RAIL_SLUG, MENU_PACK_SLUG, MENU_AVULSO_SLUG]
const MENU_PRODUCT_COLOR_CONFIG_ERROR = 'Este produto ainda não tem cores configuradas. Contacte-nos para finalizar o pedido.'
const MENU_RAIL_COLOR_CONFIG_ERROR = 'As cores das calhas não estão configuradas.'
const MENU_LETTER_COLOR_REQUEST_MAX_CHARS = 300
const MAX_LOGO_SVG_BYTES = 150 * 1024

type CheckoutPayload = {
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  shipping?: {
    method?: 'pickup_carcavelos' | 'mainland_portugal'
    address?: string
  }
  notes?: string
  menuSystem?: {
    dimensionSet?: 'v1-standard-250'
    fontStyle?: FontStyle
    walls?: PhysicalWall[]
    physicalGrid?: PhysicalRow[]
    categories?: unknown[]
    extraLetterGroups?: ExtraLetterGroup[]
    extraLetterPackSelections?: ExtraLetterPackSelection[]
    checkoutLane?: CheckoutLane
    customBrandColor?: string
    customBrandColorTarget?: 'rails' | 'letters'
    menuText?: string
    extraLettersText?: string
    customIconRequest?: string
    letterColorRequest?: {
      enabled?: boolean
      description?: string
    }
    moduleLengthCm?: 25
    charsPerModuleEstimate?: 5
    globalModuleCount?: number
    standardPackQuantity?: number
    avulsoCharacterQuantity?: number
    lines?: {
      index?: number
      text?: string
      label?: string
      detail?: string
      useAccent?: boolean
      moduleCount?: number
      categoryId?: string
      widthCm?: number
      widthMm?: number
      railModuleQuantity?: number
      suffix?: string
      price?: string
      characterCount?: number
      textWidthMm?: number
      globalWidthMm?: number
      widthWarning?: boolean
    }[]
    railColor?: ProductColor
    letterColor?: ProductColor
    baseLetterColor?: ProductColor
    accentLetterColor?: ProductColor
    letterCardColor?: ProductColor
  }
  manualQuote?: {
    requested?: boolean
    spaceType?: string
  }
  items?: {
    productSlug?: string
    quantity?: number
    selectedColor?: ProductColor
    selectedColors?: ProductColor[]
    selectedParts?: CartItemPartColor[]
    selectedVariant?: CartItemVariant
    customizations?: {
      label?: string
      value?: string
      priceAdd?: number
    }[]
  }[]
}

type MenuItemRole = 'rails' | 'standard_pack' | 'avulso'
type MenuBaseUnitPrices = Partial<Record<MenuItemRole, number>>
type MenuValidationResult = {
  quote: MenuQuote | null
  physicalBom: ReturnType<typeof getWallsBom> | null
  extraLetterPackSelections: ExtraLetterPackSelection[]
}
type MenuProductColorRecord = {
  slug?: string
  inventory?: {
    colorInventory?: {
      globalColorId?: string
      colorName: string
      colorHex: string
      offered: boolean
      priceAdd?: number
    }[]
  }
}
type MenuProductInventoryRecord = NonNullable<MenuProductColorRecord['inventory']> & {
  productSlug?: string
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey)
}

function getMenuItemRole(slug: string): MenuItemRole | undefined {
  if (slug === MENU_RAIL_SLUG) return 'rails'
  if (slug === MENU_PACK_SLUG) return 'standard_pack'
  if (slug === MENU_AVULSO_SLUG) return 'avulso'
  return undefined
}

function getMenuRows(menuSystem: NonNullable<CheckoutPayload['menuSystem']>): MenuRowInput[] | undefined {
  const physicalRows = Array.isArray(menuSystem.walls) && menuSystem.walls.length > 0
    ? flattenTextRowsFromWalls(menuSystem.walls)
    : menuSystem.physicalGrid

  if (Array.isArray(physicalRows) && physicalRows.length > 0) {
    const rows = physicalGridToMenuRows(physicalRows)
      .map(row => ({
        id: row.id,
        label: String(row.label ?? '').trim(),
        detail: String(row.detail ?? '').trim(),
        useAccent: Boolean(row.useAccent),
        moduleCount: row.moduleCount,
        categoryId: row.categoryId,
      }))
      .filter(row => row.label || row.detail)

    return rows.length ? rows : undefined
  }

  const rows = (menuSystem.lines ?? [])
    .map(line => ({
      label: String(line.label ?? '').trim(),
      detail: String(line.detail ?? [line.suffix, line.price].filter(Boolean).join(' ')).trim(),
      useAccent: Boolean(line.useAccent),
      moduleCount: Number.isFinite(Number(line.moduleCount)) ? Number(line.moduleCount) : undefined,
      categoryId: line.categoryId,
    }))
    .filter(row => row.label || row.detail)

  return rows.length ? rows : undefined
}

async function getMenuProductColorRecords() {
  const data = await dbAdmin.query({
    catalogProducts: {
      $: {
        where: {
          slug: { $in: MENU_PRODUCT_SLUGS },
        },
      },
      inventory: {},
    },
    productInventory: {
      $: {
        where: {
          productSlug: { $in: MENU_PRODUCT_SLUGS },
        },
      },
    },
  })

  const inventoryBySlug = new Map(
    ((data.productInventory ?? []) as MenuProductInventoryRecord[]).map(inventory => [String(inventory.productSlug ?? ''), inventory]),
  )

  return Object.fromEntries(
    ((data.catalogProducts ?? []) as MenuProductColorRecord[]).map(product => {
      const slug = String(product.slug ?? '')
      return [slug, {
        ...product,
        inventory: product.inventory ?? inventoryBySlug.get(slug),
      }]
    }),
  ) as Record<string, MenuProductColorRecord | undefined>
}

function getMenuItemQuantity(items: NonNullable<CheckoutPayload['items']>, slug: string) {
  return items.reduce((sum, item) => sum + (String(item.productSlug ?? '').trim() === slug ? Number(item.quantity) || 0 : 0), 0)
}

function getByteSize(value: string) {
  return new TextEncoder().encode(value).byteLength
}

function hasLogoSvg(walls: PhysicalWall[] | undefined) {
  return (walls ?? []).some(wall => wall.type === 'logo' && Boolean(wall.logoSvgText || wall.logoSvgUrl))
}

function validateLogoSvgPayload(walls: PhysicalWall[] | undefined) {
  for (const wall of walls ?? []) {
    if (wall.type !== 'logo') continue
    const svgText = String(wall.logoSvgText ?? '')
    if (!svgText) continue
    if (getByteSize(svgText) > MAX_LOGO_SVG_BYTES) {
      throw new Error('O ficheiro do logótipo é demasiado grande. Por favor, use um SVG otimizado com menos de 150KB.')
    }
    if (/<script[\s>]/i.test(svgText) || /<foreignObject[\s>]/i.test(svgText) || /\son[a-z]+\s*=/i.test(svgText)) {
      throw new Error('O SVG do logótipo contém conteúdo não suportado.')
    }
  }
}

function colorsMatch(left: ProductColor | undefined, right: ProductColor | undefined) {
  if (!left || !right) return false
  if (left.globalColorId && right.globalColorId) return left.globalColorId === right.globalColorId
  return normalizeName(left.name) === normalizeName(right.name)
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatCustomText(customizations: NonNullable<CheckoutPayload['items']>[number]['customizations']) {
  return (customizations ?? [])
    .map(customization => ({
      label: String(customization.label ?? '').trim(),
      value: String(customization.value ?? '').trim(),
    }))
    .filter(customization => customization.label && customization.value)
    .map(customization => `${customization.label}: ${customization.value}`)
    .join(' | ')
}

function getVariant(product: Product, selectedVariant?: CartItemVariant) {
  if (!selectedVariant?.id) return undefined
  return product.variants?.find(variant => variant.id === selectedVariant.id)
}

function normalizeName(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

function getOfferedProductColors(product: MenuProductColorRecord | undefined) {
  return product?.inventory?.colorInventory?.filter(color => color.offered) ?? []
}

function getActiveGlobalColor(globalColors: GlobalColor[], color: ProductColor | undefined) {
  if (!color?.name && !color?.globalColorId) return undefined
  return globalColors.find(candidate => {
    const isActive = candidate.isActive !== false && candidate.spoolStatus !== 'archived'
    if (!isActive) return false
    if (color.globalColorId && (candidate.id === color.globalColorId || candidate.globalColorId === color.globalColorId)) return true
    return normalizeName(candidate.name) === normalizeName(color.name)
  })
}

function validateMenuColor(
  globalColors: GlobalColor[],
  color: ProductColor | undefined,
  label: string,
  product?: MenuProductColorRecord,
  options: { validateProductAvailability?: boolean; configError?: string } = { validateProductAvailability: true },
) {
  if (!color?.name && !color?.globalColorId) {
    throw new Error(`Escolha a ${label}.`)
  }

  const match = getActiveGlobalColor(globalColors, color)

  if (!match) {
    throw new Error(`A ${label} selecionada já não está disponível.`)
  }

  if (options.validateProductAvailability === false) return

  const offeredColors = getOfferedProductColors(product)
  if (offeredColors.length === 0) {
    throw new Error(options.configError ?? MENU_PRODUCT_COLOR_CONFIG_ERROR)
  }

  const isOffered = offeredColors.some(offeredColor => {
    if (color.globalColorId && offeredColor.globalColorId === color.globalColorId) return true
    if (match.id && offeredColor.globalColorId === match.id) return true
    if (match.globalColorId && offeredColor.globalColorId === match.globalColorId) return true
    return normalizeName(offeredColor.colorName) === normalizeName(color.name) ||
      normalizeName(offeredColor.colorName) === normalizeName(match.name)
  })

  if (!isOffered) {
    throw new Error(`A ${label} selecionada não está disponível para este produto.`)
  }
}

function getTrustedMenuColor(
  globalColors: GlobalColor[],
  color: ProductColor | undefined,
  label: string,
  product?: MenuProductColorRecord,
  options: { validateProductAvailability?: boolean; configError?: string } = { validateProductAvailability: true },
): ProductColor {
  validateMenuColor(globalColors, color, label, product, options)
  const match = getActiveGlobalColor(globalColors, color)
  if (!match) {
    throw new Error(`A ${label} selecionada já não está disponível.`)
  }
  return {
    name: match.name,
    hex: match.hex,
    globalColorId: match.id ?? match.globalColorId,
    priceAdd: match.priceAdd,
  }
}

function validateExtraLetterPackSelections(
  selections: unknown,
  globalColors: GlobalColor[],
  menuProducts: Record<string, MenuProductColorRecord | undefined>,
): ExtraLetterPackSelection[] {
  if (!Array.isArray(selections)) {
    throw new Error('Envie extraLetterPackSelections para o menu físico.')
  }

  return selections.map((selection, index) => {
    if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
      throw new Error(`Pack extra ${index + 1} inválido.`)
    }
    const value = selection as Partial<ExtraLetterPackSelection>
    const packId = value.packId
    if (typeof packId !== 'string' || !(packId in EXTRA_LETTER_PACKS)) {
      throw new Error(`Pack extra ${index + 1} não existe.`)
    }
    const quantity = Number(value.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_MENU_QUANTITY) {
      throw new Error(`Quantidade inválida no pack extra ${index + 1}.`)
    }
    const trustedColor = getTrustedMenuColor(
      globalColors,
      value.color as ProductColor | undefined,
      `cor do pack extra ${index + 1}`,
      menuProducts[MENU_AVULSO_SLUG],
    )
    return {
      id: String(value.id || `${packId}-${index}`),
      packId,
      color: {
        name: trustedColor.name,
        hex: trustedColor.hex ?? '#d1d5db',
        globalColorId: trustedColor.globalColorId ?? '',
        priceAdd: trustedColor.priceAdd,
      },
      quantity,
    }
  })
}

function getEffectiveLetterColorPriceAdd(globalColors: GlobalColor[], menuSystem: NonNullable<CheckoutPayload['menuSystem']>) {
  return Math.max(
    getGlobalColorPriceAdd(globalColors, menuSystem.baseLetterColor ?? menuSystem.letterColor),
    getGlobalColorPriceAdd(globalColors, menuSystem.accentLetterColor ?? menuSystem.baseLetterColor ?? menuSystem.letterColor),
    getGlobalColorPriceAdd(globalColors, menuSystem.letterCardColor),
    ...(menuSystem.extraLetterGroups ?? []).map(group => getGlobalColorPriceAdd(globalColors, group.color)),
    ...(menuSystem.extraLetterPackSelections ?? []).map(selection => getGlobalColorPriceAdd(globalColors, selection.color)),
  )
}

function hasUnsupportedControlCharacters(value: string) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value)
}

function calculateVisibleCharacters(value: string) {
  return Array.from(String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '')).length
}

function validateLetterColorRequest(menuSystem: NonNullable<CheckoutPayload['menuSystem']>) {
  const request = menuSystem.letterColorRequest
  if (!request?.enabled) return
  const description = String(request.description ?? '').trim()
  if (!description) return

  if (calculateVisibleCharacters(description) > MENU_LETTER_COLOR_REQUEST_MAX_CHARS) {
    throw new Error(`O pedido de cor pode ter no máximo ${MENU_LETTER_COLOR_REQUEST_MAX_CHARS} caracteres.`)
  }
  if (hasUnsupportedControlCharacters(description)) {
    throw new Error('O pedido de cor contém caracteres não suportados.')
  }
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(description) || /(?:\+?\d[\s().-]*){7,}/.test(description)) {
    throw new Error('Descreva apenas a cor pretendida, sem contactos pessoais.')
  }
}

function sanitizeMenuColor(color: ProductColor | undefined) {
  if (!color) return undefined
  return {
    name: color.name,
    hex: color.hex,
    globalColorId: color.globalColorId,
    priceAdd: color.priceAdd,
  }
}

function validateMenuPayload(
  body: CheckoutPayload,
  globalColors: GlobalColor[],
  menuProducts: Record<string, MenuProductColorRecord | undefined> = {},
): MenuValidationResult {
  if (!body.menuSystem) {
    return { quote: null, physicalBom: null, extraLetterPackSelections: [] }
  }

  const items = body.items ?? []
  const usesWalls = Array.isArray(body.menuSystem.walls) && body.menuSystem.walls.length > 0
  const physicalGrid = usesWalls ? flattenTextRowsFromWalls(body.menuSystem.walls) : body.menuSystem.physicalGrid
  const usesPhysicalGrid = usesWalls || (Array.isArray(physicalGrid) && physicalGrid.length > 0)
  if (body.menuSystem.moduleLengthCm !== undefined && body.menuSystem.moduleLengthCm !== MODULE_LENGTH_CM) {
    throw new Error(`Os módulos do Sinalética Modular usam ${MODULE_LENGTH_CM}cm.`)
  }
  if (body.menuSystem.charsPerModuleEstimate !== undefined && body.menuSystem.charsPerModuleEstimate !== CHARS_PER_MODULE_ESTIMATE) {
    throw new Error(`Cada módulo estima cerca de ${CHARS_PER_MODULE_ESTIMATE} caracteres.`)
  }
  if (usesPhysicalGrid && body.menuSystem.dimensionSet !== PHYSICAL_GRID_DIMENSION_SET) {
    throw new Error('A grelha física usa uma dimensão não suportada.')
  }
  if (usesPhysicalGrid && body.menuSystem.fontStyle !== 'classic' && body.menuSystem.fontStyle !== 'modern') {
    throw new Error('Escolha o estilo de letra STL.')
  }
  if (!usesPhysicalGrid && !Number.isInteger(Number(body.menuSystem.globalModuleCount))) {
    throw new Error('Escolha a largura do Sinalética Modular em módulos.')
  }
  if (!usesPhysicalGrid && (Number(body.menuSystem.globalModuleCount) < MIN_GLOBAL_MODULES || Number(body.menuSystem.globalModuleCount) > MAX_GLOBAL_MODULES)) {
    throw new Error(`A largura deve ter entre ${MIN_GLOBAL_MODULES} e ${MAX_GLOBAL_MODULES} módulos.`)
  }

  if (usesPhysicalGrid) {
    validateLogoSvgPayload(body.menuSystem.walls)
    if (usesWalls) {
      if (Object.prototype.hasOwnProperty.call(body.menuSystem, 'extraLetterGroups')) {
        throw new Error('O menu físico usa extraLetterPackSelections. Remova extraLetterGroups do payload.')
      }

      const trustedExtraLetterPackSelections = validateExtraLetterPackSelections(
        body.menuSystem.extraLetterPackSelections,
        globalColors,
        menuProducts,
      )
      const railColor = getTrustedMenuColor(globalColors, body.menuSystem.railColor, 'cor das calhas', menuProducts[MENU_RAIL_SLUG], {
        configError: MENU_RAIL_COLOR_CONFIG_ERROR,
      })
      const baseLetterColor = getTrustedMenuColor(globalColors, body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor, 'cor das letras', menuProducts[MENU_PACK_SLUG])
      const accentLetterColor = getTrustedMenuColor(globalColors, body.menuSystem.accentLetterColor ?? body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor, 'cor de destaque', menuProducts[MENU_PACK_SLUG])
      getTrustedMenuColor(globalColors, body.menuSystem.letterCardColor, 'cor do fundo das letras', menuProducts[MENU_PACK_SLUG])

      const physicalBom = getWallsBom({
        walls: body.menuSystem.walls ?? [],
        extraLetterPackSelections: trustedExtraLetterPackSelections,
        baseLetterColor: sanitizeMenuColor(baseLetterColor),
        accentLetterColor: sanitizeMenuColor(accentLetterColor),
        hasCustomBrandColor: Boolean(String(body.menuSystem.customBrandColor ?? '').trim()),
        standardPackQuantity: Number(body.menuSystem.standardPackQuantity),
        avulsoCharacterQuantity: Number(body.menuSystem.avulsoCharacterQuantity),
      })

      if (physicalBom.totalRailModules < 1 && !hasLogoSvg(body.menuSystem.walls)) {
        throw new Error('A grelha física deve ter pelo menos uma calha.')
      }
      if (physicalBom.hasOverflow) {
        throw new Error('Há texto que excede o tamanho da calha física.')
      }

      const expectedQuantities = [
        { slug: MENU_RAIL_SLUG, quantity: physicalBom.totalRailModules, label: 'módulos de 25cm' },
        { slug: MENU_PACK_SLUG, quantity: physicalBom.standardPackQuantity, label: 'packs standard' },
        { slug: MENU_AVULSO_SLUG, quantity: physicalBom.avulsoCharacterQuantity, label: 'letras avulso' },
      ]
      for (const expected of expectedQuantities) {
        if (getMenuItemQuantity(items, expected.slug) !== expected.quantity) {
          throw new Error(`A quantidade de ${expected.label} não corresponde ao cálculo do menu.`)
        }
      }

      for (const item of items) {
        const slug = String(item.productSlug ?? '').trim()
        if (!getMenuItemRole(slug)) {
          throw new Error('A encomenda do Menu Modular só pode incluir componentes do menu.')
        }
        if (slug === MENU_RAIL_SLUG && !colorsMatch(item.selectedColor, railColor)) {
          throw new Error('A cor das calhas no carrinho não corresponde ao cálculo do menu.')
        }
        if ((slug === MENU_PACK_SLUG || slug === MENU_AVULSO_SLUG) && !colorsMatch(item.selectedColor, baseLetterColor)) {
          throw new Error('A cor das letras no carrinho não corresponde ao cálculo do menu.')
        }
      }

      return {
        quote: null,
        physicalBom,
        extraLetterPackSelections: trustedExtraLetterPackSelections,
      }
    }

    const physicalBom = usesWalls ? getWallsBom({
      walls: body.menuSystem.walls ?? [],
      extraLetterGroups: body.menuSystem.extraLetterGroups ?? [],
      baseLetterColor: sanitizeMenuColor(body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
      accentLetterColor: sanitizeMenuColor(body.menuSystem.accentLetterColor ?? body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
      standardPackQuantity: Number(body.menuSystem.standardPackQuantity),
      avulsoCharacterQuantity: Number(body.menuSystem.avulsoCharacterQuantity),
      hasCustomBrandColor: Boolean(String(body.menuSystem.customBrandColor ?? '').trim()),
    }) : getGridBom({
      grid: physicalGrid ?? [],
      extraLetterGroups: body.menuSystem.extraLetterGroups ?? [],
      baseLetterColor: sanitizeMenuColor(body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
      accentLetterColor: sanitizeMenuColor(body.menuSystem.accentLetterColor ?? body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
      standardPackQuantity: Number(body.menuSystem.standardPackQuantity),
      avulsoCharacterQuantity: Number(body.menuSystem.avulsoCharacterQuantity),
    })

    if (physicalBom.totalRailModules < 1 && !hasLogoSvg(body.menuSystem.walls)) {
      throw new Error('A grelha física deve ter pelo menos uma calha.')
    }
    if (physicalBom.hasOverflow) {
      throw new Error('Há texto que excede o tamanho da calha física.')
    }
    for (const group of body.menuSystem.extraLetterGroups ?? []) {
      if (group.quantity > 0 && !group.color?.name && !group.color?.globalColorId) {
        throw new Error('Escolha a cor de todos os conjuntos de Letras Extra.')
      }
    }
    if (usesWalls && (physicalGrid?.length ?? 0) === 0 && hasLogoSvg(body.menuSystem.walls)) {
      return { quote: null, physicalBom: null, extraLetterPackSelections: [] }
    }
  }

  const quote = calculateMenuQuote({
    rows: getMenuRows(body.menuSystem),
    menuText: String(body.menuSystem.menuText ?? ''),
    extraLettersText: usesPhysicalGrid
      ? extraLetterGroupsToText(body.menuSystem.extraLetterGroups)
      : String(body.menuSystem.extraLettersText ?? ''),
    customIconRequest: String(body.menuSystem.customIconRequest ?? ''),
    globalModuleCount: usesPhysicalGrid
      ? Math.max(MIN_GLOBAL_MODULES, ...physicalGridToMenuRows(physicalGrid ?? []).map(row => row.moduleCount))
      : Number(body.menuSystem.globalModuleCount),
    standardPackQuantity: Number(body.menuSystem.standardPackQuantity),
    avulsoCharacterQuantity: Number(body.menuSystem.avulsoCharacterQuantity),
  })
  const limitErrors = validateMenuQuoteLimits(quote)

  if (limitErrors.length) {
    throw new Error(limitErrors[0])
  }
  if (quote.lines.some(line => line.widthWarning)) {
    throw new Error('Há texto que excede o tamanho da calha física.')
  }

  const expectedQuantities = [
    { slug: MENU_RAIL_SLUG, quantity: quote.totalRailModules, label: 'módulos de 25cm' },
    { slug: MENU_PACK_SLUG, quantity: quote.standardPackQuantity, label: 'packs standard' },
    { slug: MENU_AVULSO_SLUG, quantity: quote.avulsoCharacterQuantity, label: 'letras avulso' },
  ]

  for (const expected of expectedQuantities) {
    if (getMenuItemQuantity(items, expected.slug) !== expected.quantity) {
      throw new Error(`A quantidade de ${expected.label} não corresponde ao cálculo do menu.`)
    }
  }

  for (const item of items) {
    const slug = String(item.productSlug ?? '').trim()
    if (!getMenuItemRole(slug)) {
      throw new Error('A encomenda do Menu Modular só pode incluir componentes do menu.')
    }
  }

  validateLetterColorRequest(body.menuSystem)
  validateMenuColor(globalColors, body.menuSystem.railColor, 'cor das calhas', menuProducts[MENU_RAIL_SLUG], {
    configError: MENU_RAIL_COLOR_CONFIG_ERROR,
  })

  const baseLetterColor = body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor
  const accentLetterColor = body.menuSystem.accentLetterColor ?? baseLetterColor
  const letterCardColor = body.menuSystem.letterCardColor
  const hasStandardPack = getMenuItemQuantity(items, MENU_PACK_SLUG) > 0
  const hasAvulsoLetters = getMenuItemQuantity(items, MENU_AVULSO_SLUG) > 0
  if (hasStandardPack) {
    validateMenuColor(globalColors, baseLetterColor, 'cor das letras', menuProducts[MENU_PACK_SLUG])
    validateMenuColor(globalColors, accentLetterColor, 'cor de destaque', menuProducts[MENU_PACK_SLUG])
    validateMenuColor(globalColors, letterCardColor, 'cor do fundo das letras', menuProducts[MENU_PACK_SLUG])
  }
  if (hasAvulsoLetters) {
    validateMenuColor(globalColors, baseLetterColor, 'cor das letras', menuProducts[MENU_AVULSO_SLUG])
    validateMenuColor(globalColors, accentLetterColor, 'cor de destaque', menuProducts[MENU_AVULSO_SLUG])
    validateMenuColor(globalColors, letterCardColor, 'cor do fundo das letras', menuProducts[MENU_AVULSO_SLUG])
  }
  if (!hasStandardPack && !hasAvulsoLetters) {
    validateMenuColor(globalColors, baseLetterColor, 'cor das letras', undefined, { validateProductAvailability: false })
    validateMenuColor(globalColors, accentLetterColor, 'cor de destaque', undefined, { validateProductAvailability: false })
    validateMenuColor(globalColors, letterCardColor, 'cor do fundo das letras', undefined, { validateProductAvailability: false })
  }

  for (const item of items) {
    const slug = String(item.productSlug ?? '').trim()
    if (slug === MENU_RAIL_SLUG && !colorsMatch(item.selectedColor, body.menuSystem.railColor)) {
      throw new Error('A cor das calhas no carrinho não corresponde ao cálculo do menu.')
    }
    if ((slug === MENU_PACK_SLUG || slug === MENU_AVULSO_SLUG) && !colorsMatch(item.selectedColor, baseLetterColor)) {
      throw new Error('A cor das letras no carrinho não corresponde ao cálculo do menu.')
    }
  }

  return { quote, physicalBom: null, extraLetterPackSelections: [] }
}

function getMenuItemDetails(
  role: MenuItemRole | undefined,
  quote: MenuQuote | null,
  menuSystem?: CheckoutPayload['menuSystem'],
  physicalBom?: ReturnType<typeof getWallsBom> | null,
  trustedExtraLetterPackSelections: ExtraLetterPackSelection[] = [],
) {
  if (!role || (!quote && !physicalBom)) return undefined

  if (!quote && physicalBom) {
    const base = {
      role,
      dimensionSet: menuSystem?.dimensionSet,
      fontStyle: menuSystem?.fontStyle,
      walls: menuSystem?.walls,
      physicalGrid: menuSystem?.physicalGrid,
      categories: menuSystem?.categories,
      extraLetterPackSelections: trustedExtraLetterPackSelections,
      checkoutLane: menuSystem?.checkoutLane,
      customBrandColor: menuSystem?.customBrandColor,
      customBrandColorTarget: menuSystem?.customBrandColorTarget,
      moduleLengthCm: MODULE_LENGTH_CM,
      charsPerModuleEstimate: CHARS_PER_MODULE_ESTIMATE,
      menuText: '',
      extraLettersText: '',
      customIconRequest: '',
      lineCount: physicalBom.lineCount,
      globalModuleCount: physicalBom.maxRailModules,
      globalWidthCm: physicalBom.maxRailModules * MODULE_LENGTH_CM,
      globalWidthMm: physicalBom.maxRailModules * 250,
      productionFont: menuSystem?.fontStyle === 'modern' ? 'Inter Tight Bold STL' : 'Libre Baskerville Bold STL',
      productionSize: 'physical-grid',
      starterQuantity: 0,
      extensionQuantityPerLine: 0,
      totalExtensionQuantity: 0,
      totalRailModules: physicalBom.totalRailModules,
      menuCharacters: physicalBom.menuCharacters,
      extraCharacters: physicalBom.extraCharacters,
      totalCharacters: physicalBom.totalCharacters,
      standardPackMinimum: physicalBom.standardPackMinimum,
      standardPackQuantity: physicalBom.standardPackQuantity,
      avulsoMinimum: physicalBom.avulsoMinimum,
      avulsoCharacterQuantity: physicalBom.avulsoCharacterQuantity,
      characterFrequencyMap: physicalBom.characterFrequencyMap,
      characterFrequencyByColor: physicalBom.characterFrequencyByColor,
      avulsoDeficitMap: physicalBom.avulsoDeficitMap,
      railModuleUnitPrice: physicalBom.railModuleUnitPrice,
      standardPackUnitPrice: physicalBom.standardPackUnitPrice,
      avulsoUnitPrice: physicalBom.avulsoUnitPrice,
      modulesSubtotal: physicalBom.modulesSubtotal,
      standardPacksSubtotal: physicalBom.standardPacksSubtotal,
      avulsoSubtotal: physicalBom.avulsoSubtotal,
      subtotalBeforeDiscount: physicalBom.subtotalBeforeDiscount,
      launchDiscountPercent: physicalBom.launchDiscountPercent,
      launchDiscountAmount: physicalBom.launchDiscountAmount,
      totalAfterDiscount: physicalBom.totalAfterDiscount,
      railColor: sanitizeMenuColor(menuSystem?.railColor),
      letterColor: sanitizeMenuColor(menuSystem?.baseLetterColor ?? menuSystem?.letterColor),
      baseLetterColor: sanitizeMenuColor(menuSystem?.baseLetterColor ?? menuSystem?.letterColor),
      accentLetterColor: sanitizeMenuColor(menuSystem?.accentLetterColor ?? menuSystem?.baseLetterColor ?? menuSystem?.letterColor),
      letterCardColor: sanitizeMenuColor(menuSystem?.letterCardColor),
    }

    return base
  }

  if (!quote) return undefined

  const base = {
    role,
    dimensionSet: menuSystem?.dimensionSet,
    fontStyle: menuSystem?.fontStyle,
    walls: menuSystem?.walls,
    physicalGrid: menuSystem?.physicalGrid,
    categories: menuSystem?.categories,
    extraLetterGroups: menuSystem?.extraLetterGroups,
    extraLetterPackSelections: trustedExtraLetterPackSelections,
    checkoutLane: menuSystem?.checkoutLane,
    customBrandColor: menuSystem?.customBrandColor,
    customBrandColorTarget: menuSystem?.customBrandColorTarget,
    moduleLengthCm: quote.moduleLengthCm,
    charsPerModuleEstimate: quote.charsPerModuleEstimate,
    menuText: quote.menuText,
    extraLettersText: quote.extraLettersText || undefined,
    customIconRequest: quote.customIconRequest || undefined,
    lineCount: quote.lineCount,
    globalModuleCount: quote.globalModuleCount,
    globalWidthCm: quote.globalWidthCm,
    estimatedCharsPerLine: quote.estimatedCharsPerLine,
    productionFont: quote.productionFont,
    productionSize: quote.productionSize,
    starterQuantity: quote.starterQuantity,
    extensionQuantityPerLine: quote.extensionQuantityPerLine,
    totalExtensionQuantity: quote.totalExtensionQuantity,
    totalRailModules: quote.totalRailModules,
    menuCharacters: quote.menuCharacters,
    extraCharacters: quote.extraCharacters,
    totalCharacters: quote.totalCharacters,
    standardPackMinimum: quote.standardPackMinimum,
    standardPackQuantity: quote.standardPackQuantity,
    avulsoMinimum: quote.avulsoMinimum,
    avulsoCharacterQuantity: quote.avulsoCharacterQuantity,
    characterFrequencyMap: quote.characterFrequencyMap,
    characterFrequencyByColor: quote.characterFrequencyByColor,
    avulsoDeficitMap: quote.avulsoDeficitMap,
    railModuleUnitPrice: quote.railModuleUnitPrice,
    standardPackUnitPrice: quote.standardPackUnitPrice,
    avulsoUnitPrice: quote.avulsoUnitPrice,
    modulesSubtotal: quote.modulesSubtotal,
    standardPacksSubtotal: quote.standardPacksSubtotal,
    avulsoSubtotal: quote.avulsoSubtotal,
    subtotalBeforeDiscount: quote.subtotalBeforeDiscount,
    launchDiscountPercent: quote.launchDiscountPercent,
    launchDiscountAmount: quote.launchDiscountAmount,
    totalAfterDiscount: quote.totalAfterDiscount,
    railColor: sanitizeMenuColor(menuSystem?.railColor),
    letterColor: sanitizeMenuColor(menuSystem?.baseLetterColor ?? menuSystem?.letterColor),
    baseLetterColor: sanitizeMenuColor(menuSystem?.baseLetterColor ?? menuSystem?.letterColor),
    accentLetterColor: sanitizeMenuColor(menuSystem?.accentLetterColor ?? menuSystem?.baseLetterColor ?? menuSystem?.letterColor),
    letterCardColor: sanitizeMenuColor(menuSystem?.letterCardColor),
    letterColorRequest: menuSystem?.letterColorRequest?.enabled
      ? {
          enabled: true,
          description: String(menuSystem.letterColorRequest.description ?? '').trim(),
        }
      : undefined,
  }

  if (role === 'rails') {
    return { ...base, lines: quote.lines }
  }

  return base
}

function getMenuCustomText(
  role: MenuItemRole | undefined,
  quote: MenuQuote | null,
  customText: string,
  physicalBom?: ReturnType<typeof getWallsBom> | null,
) {
  if (!role || (!quote && !physicalBom)) return customText || undefined

  if (!quote && physicalBom) {
    const menuText = role === 'rails'
      ? `${physicalBom.totalRailModules} módulos de ${MODULE_LENGTH_CM}cm (${physicalBom.lineCount} linhas, larguras físicas variáveis)`
      : role === 'standard_pack'
        ? `${physicalBom.standardPackQuantity} pack(s) de 300 caracteres`
        : `${physicalBom.avulsoCharacterQuantity} letras avulso`
    return [customText, menuText].filter(Boolean).join(' | ')
  }

  if (!quote) return customText || undefined

  const menuText = role === 'rails'
    ? `${quote.totalRailModules} módulos de ${quote.moduleLengthCm}cm (${quote.lineCount} linhas, larguras físicas variáveis)`
    : role === 'standard_pack'
      ? `${quote.standardPackQuantity} pack(s) de 300 caracteres`
      : `${quote.avulsoCharacterQuantity} letras avulso`

  return [customText, menuText].filter(Boolean).join(' | ')
}

function formatCharacterMap(map: Record<string, number> | undefined) {
  const entries = Object.entries(map ?? {})
    .sort(([a], [b]) => a.localeCompare(b, 'pt-PT'))
    .map(([character, count]) => `${character === ' ' ? 'Espaço' : character}(${count})`)
  return entries.length ? entries.join(', ') : '-'
}

function formatLettersByColor(source: Pick<MenuQuote, 'characterFrequencyByColor'> | Pick<ReturnType<typeof getWallsBom>, 'characterFrequencyByColor'>) {
  return Object.values(source.characterFrequencyByColor ?? {})
    .map(group => `LETRAS — ${group.color.name}: ${formatCharacterMap(group.characters)}`)
    .join('\n') || '-'
}

function getMenuOrderNotes(
  quote: MenuQuote | null,
  menuSystem?: CheckoutPayload['menuSystem'],
  physicalBom?: ReturnType<typeof getWallsBom> | null,
) {
  if (!quote && !physicalBom) return ''
  const letterColorRequest = menuSystem?.letterColorRequest?.enabled
    ? String(menuSystem.letterColorRequest.description ?? '').trim()
    : ''
  const customBrandColor = String(menuSystem?.customBrandColor ?? '').trim()
  const customBrandColorTarget = menuSystem?.customBrandColorTarget === 'rails' ? 'calhas' : 'letras'
  const baseLetterColor = menuSystem?.baseLetterColor ?? menuSystem?.letterColor
  const accentLetterColor = menuSystem?.accentLetterColor ?? baseLetterColor
  const letterCardColor = menuSystem?.letterCardColor
  const widthWarnings = quote
    ? quote.lines
        .filter(line => line.widthWarning)
        .map(line => `Linha ${line.index}: ${line.text}`)
        .join('\n') || '-'
    : physicalBom?.hasOverflow ? 'Há texto que excede o tamanho da calha física.' : '-'
  const productionMap = menuSystem?.walls?.length
    ? menuSystem.walls.map((wall, wallIndex) => {
        if (wall.type === 'logo') {
          return `PAREDE ${wallIndex + 1} (${wall.name}) — LOGÓTIPO SVG: ${wall.logoSvgText ? 'incluído para orçamento/modelação' : 'por carregar'}`
        }
        const rows = wall.rows.flatMap((row, rowIndex) => row.columns.map((column, columnIndex) => (
          `PAREDE ${wallIndex + 1} (${wall.name}) — Row ${rowIndex + 1}, Col ${columnIndex + 1}: ${column.railModules} módulo(s) / ${column.railModules * 250}mm / ${menuSystem?.fontStyle ?? 'classic'} / ${column.leftText || '-'} / ${column.rightText || '-'} / calha ${column.railAlign} / texto ${column.textAlign}`
        )))
        return rows.join('\n')
      }).join('\n')
    : (menuSystem?.physicalGrid ?? [])
        .flatMap((row, rowIndex) => row.columns.map((column, columnIndex) => (
          `Row ${rowIndex + 1}, Col ${columnIndex + 1}: ${column.railModules} módulo(s) / ${column.railModules * 250}mm / ${menuSystem?.fontStyle ?? 'classic'} / ${column.leftText || '-'} / ${column.rightText || '-'}`
        )))
        .join('\n') || '-'

  return `Sistema Modular — Collection 01

RESUMO DO SISTEMA
Texto original:
${quote?.menuText || '-'}

Linhas: ${quote?.lineCount ?? physicalBom?.lineCount ?? 0}
Dimensão: ${menuSystem?.dimensionSet || 'legacy'}
Fonte STL: ${menuSystem?.fontStyle || 'classic'}
Linha mais larga: ${quote?.globalModuleCount ?? physicalBom?.maxRailModules ?? 0} módulos / ${quote?.globalWidthCm ?? ((physicalBom?.maxRailModules ?? 0) * MODULE_LENGTH_CM)}cm (${quote?.globalWidthMm ?? ((physicalBom?.maxRailModules ?? 0) * 250)}mm)
Avisos de largura:
${widthWarnings}

MAPA DE PRODUÇÃO
${productionMap}

MÓDULOS
Módulos totais de 25cm: ${quote?.totalRailModules ?? physicalBom?.totalRailModules ?? 0}
Starter/base: ${quote?.starterQuantity ?? 0}
Extensões por linha: ${quote?.extensionQuantityPerLine ?? 0}
Extensões totais: ${quote?.totalExtensionQuantity ?? 0}

LETRAS POR COR
Cor das calhas: ${menuSystem?.railColor?.name || '-'}
Cor das letras: ${baseLetterColor?.name || '-'}
Cor de destaque: ${accentLetterColor?.name || '-'}
Fundo das Letras: ${letterCardColor?.name || '-'}
Pack Standard: ${quote?.standardPackQuantity ?? physicalBom?.standardPackQuantity ?? 0}
Letras avulso: ${quote?.avulsoCharacterQuantity ?? physicalBom?.avulsoCharacterQuantity ?? 0}
Défice avulso: ${formatCharacterMap(quote?.avulsoDeficitMap ?? physicalBom?.avulsoDeficitMap)}
Mapa geral: ${formatCharacterMap(quote?.characterFrequencyMap ?? physicalBom?.characterFrequencyMap)}
${formatLettersByColor(quote ?? physicalBom!)}

PEDIDOS ESPECIAIS
Letras/símbolos extra: ${(menuSystem?.extraLetterPackSelections ?? []).map(selection => `${selection.quantity}x ${EXTRA_LETTER_PACKS[selection.packId]?.label ?? selection.packId} em ${selection.color?.name ?? '-'}`).join(', ') || quote?.extraLettersText || '-'}
Cor personalizada: ${customBrandColor ? `${customBrandColor} (${customBrandColorTarget})` : '-'}
Pedido de cor especial: ${letterColorRequest || '-'}
Pedido de símbolo/logótipo: ${quote?.customIconRequest || '-'}

PREÇO
Subtotal: ${formatMoney(quote?.subtotalBeforeDiscount ?? physicalBom?.subtotalBeforeDiscount ?? 0)}
Desconto campanha: -${quote?.launchDiscountPercent ?? physicalBom?.launchDiscountPercent ?? LAUNCH_DISCOUNT_PERCENT}% (${formatMoney(quote?.launchDiscountAmount ?? physicalBom?.launchDiscountAmount ?? 0)})
Total modular: ${formatMoney(quote?.totalAfterDiscount ?? physicalBom?.totalAfterDiscount ?? 0)}`
}

function formatExtraLetterPackSummary(selections: ExtraLetterPackSelection[] = [], maxLength = 450) {
  const summary = selections
    .filter(selection => Number(selection.quantity) > 0 && EXTRA_LETTER_PACKS[selection.packId])
    .map(selection => {
      const pack = EXTRA_LETTER_PACKS[selection.packId]
      return `${selection.quantity}x ${pack.label} ${selection.color.name}`
    })
    .join(', ')

  if (summary.length <= maxLength) return summary
  return `${summary.slice(0, Math.max(0, maxLength - 1)).trim()}…`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function getGlobalColorPriceAdd(
  globalColors: GlobalColor[],
  color: { globalColorId?: string; name?: string; colorName?: string } | undefined,
) {
  if (!color) return 0
  const globalColor = color.globalColorId
    ? globalColors.find(candidate => candidate.id === color.globalColorId || candidate.globalColorId === color.globalColorId)
    : globalColors.find(candidate => normalizeName(candidate.name) === normalizeName(color.name ?? color.colorName))
  return globalColor?.priceAdd ?? 0
}

function validateCustomizations(product: Product, item: NonNullable<CheckoutPayload['items']>[number], variant?: NonNullable<Product['variants']>[number]) {
  const options = variant?.kind === 'custom_text'
    ? variant.customizationOptions ?? []
    : product.customizationOptions ?? []
  const customizations = item.customizations ?? []

  for (const customization of customizations) {
    const label = String(customization.label ?? '').trim()
    const value = String(customization.value ?? '').trim()
    if (!label || !value) continue

    const option = options.find(candidate => candidate.label === label)
    if (!option) {
      throw new Error(`Personalização inválida para ${product.name}.`)
    }
    if (value.length > option.maxChars) {
      throw new Error(`${option.label} excede o limite de caracteres.`)
    }
  }

  return customizations.reduce((sum, customization) => {
    const label = String(customization.label ?? '').trim()
    const value = String(customization.value ?? '').trim()
    if (!label || !value) return sum

    const option = options.find(candidate => candidate.label === label)
    return sum + (option?.priceAdd ?? 0)
  }, 0)
}

function getItemColors(product: Product, item: NonNullable<CheckoutPayload['items']>[number], variant?: NonNullable<Product['variants']>[number]) {
  if (variant && variant.colorMode !== 'customer_choice' && variant.colorMode !== 'multi_part') {
    return variant.colors.map(color => color.name)
  }

  if (item.selectedParts?.length) {
    return item.selectedParts.map(part => `${part.label}: ${part.colorName}`)
  }

  if (item.selectedColors?.length) {
    return item.selectedColors.map(color => color.name)
  }

  if (item.selectedColor?.name) {
    return [item.selectedColor.name]
  }

  return product.colors[0]?.name ? [product.colors[0].name] : []
}

function withColorPriceAdd<T extends ProductColor>(globalColors: GlobalColor[], color: T | undefined): T | undefined {
  if (!color) return undefined
  return {
    ...color,
    colorPriceAdd: getGlobalColorPriceAdd(globalColors, color),
  } as T & { colorPriceAdd: number }
}

function getSelectedColorPayload(
  product: Product,
  item: NonNullable<CheckoutPayload['items']>[number],
  globalColors: GlobalColor[],
  variant?: NonNullable<Product['variants']>[number],
) {
  if (variant?.colors?.length && variant.colorMode !== 'customer_choice' && variant.colorMode !== 'multi_part') {
    return {
      selectedColor: withColorPriceAdd(globalColors, variant.colors[0]),
      selectedColors: variant.colors.map(color => withColorPriceAdd(globalColors, color)).filter(Boolean),
      selectedParts: undefined,
    }
  }

  if (item.selectedParts?.length) {
    return {
      selectedColor: withColorPriceAdd(globalColors, item.selectedColor),
      selectedColors: item.selectedParts.map(part => ({
        name: part.colorName,
        hex: part.colorHex,
        globalColorId: part.globalColorId,
        colorPriceAdd: getGlobalColorPriceAdd(globalColors, part),
      })),
      selectedParts: item.selectedParts.map(part => ({
        ...part,
        colorPriceAdd: getGlobalColorPriceAdd(globalColors, part),
      })),
    }
  }

  if (item.selectedColors?.length) {
    return {
      selectedColor: withColorPriceAdd(globalColors, item.selectedColors[0]),
      selectedColors: item.selectedColors.map(color => withColorPriceAdd(globalColors, color)).filter(Boolean),
      selectedParts: undefined,
    }
  }

  const selectedColor = item.selectedColor ?? product.colors[0]
  return {
    selectedColor: withColorPriceAdd(globalColors, selectedColor),
    selectedColors: selectedColor ? [withColorPriceAdd(globalColors, selectedColor)].filter(Boolean) : [],
    selectedParts: undefined,
  }
}

function getUnitPrice(
  product: Product,
  item: NonNullable<CheckoutPayload['items']>[number],
  globalColors: GlobalColor[],
  variant?: NonNullable<Product['variants']>[number],
) {
  const basePrice = product.salePrice ?? product.priceFrom
  const customizationPriceAdd = validateCustomizations(product, item, variant)
  const variantColorMode = variant?.colorMode

  if (variant?.finalPrice !== undefined) {
    const premiumColorPriceAdd = variantColorMode === 'customer_choice'
      ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
      : variantColorMode === 'multi_part'
        ? (item.selectedParts ?? []).reduce((sum, part) => sum + getGlobalColorPriceAdd(globalColors, part), 0)
        : 0
    return variant.finalPrice + customizationPriceAdd + premiumColorPriceAdd
  }

  const variantPriceAdd = variant?.priceAdd ?? 0
  const multiColorPriceAdd = !variant && item.selectedColors && item.selectedColors.length > 1
    ? product.multiColorPriceAdd ?? 0
    : 0
  const menuColorPriceAdd = !variant && getMenuItemRole(product.slug)
    ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
    : 0
  const premiumColorPriceAdd = variantColorMode === 'customer_choice'
    ? getGlobalColorPriceAdd(globalColors, item.selectedColor ?? item.selectedColors?.[0])
    : variantColorMode === 'multi_part'
      ? (item.selectedParts ?? []).reduce((sum, part) => sum + getGlobalColorPriceAdd(globalColors, part), 0)
      : 0

  return basePrice + variantPriceAdd + multiColorPriceAdd + customizationPriceAdd + premiumColorPriceAdd + menuColorPriceAdd
}

function cents(value: number) {
  return Math.round(value * 100)
}

function discountedMenuUnitPrice(unitPrice: number) {
  return Math.round(unitPrice * (1 - LAUNCH_DISCOUNT_PERCENT / 100) * 100) / 100
}

function validateSelectedColors(
  product: Product,
  item: NonNullable<CheckoutPayload['items']>[number],
  variant: NonNullable<Product['variants']>[number] | undefined,
  globalColors: GlobalColor[],
): string | null {
  if (!variant) return null

  const colorMode = variant.colorMode
  const allowedGlobalColorIds = variant.allowedGlobalColorIds ?? []

  // Validate single color mode
  if (colorMode === 'customer_choice') {
    const selectedColor = item.selectedColor ?? item.selectedColors?.[0]
    if (selectedColor?.globalColorId && allowedGlobalColorIds.length > 0) {
      if (!allowedGlobalColorIds.includes(selectedColor.globalColorId)) {
        return `Selected color is not allowed for this variant of ${product.name}`
      }
    }
    if (!item.selectedColor && !item.selectedColors?.length) {
      return `Color selection is required for ${product.name}`
    }
    if (item.selectedColors && item.selectedColors.length > 1) {
      return `Only one color allowed for this variant of ${product.name}`
    }
  }

  // Validate multi-part mode
  if (colorMode === 'multi_part' && variant.parts?.length) {
    const selectedParts = item.selectedParts ?? []
    if (selectedParts.length !== variant.parts.length) {
      return `Invalid part selection for ${product.name}`
    }

    for (let i = 0; i < variant.parts.length; i++) {
      const partDef = variant.parts[i]
      const selectedPart = selectedParts[i]

      if (!selectedPart) {
        return `Missing color selection for ${partDef.label} in ${product.name}`
      }

      // Check fixed color constraint
      if (partDef.fixedGlobalColorId && selectedPart.globalColorId !== partDef.fixedGlobalColorId) {
        return `Invalid color for ${partDef.label} in ${product.name}`
      }

      // Check allowed colors constraint
      if (partDef.allowedGlobalColorIds?.length && selectedPart.globalColorId) {
        if (!partDef.allowedGlobalColorIds.includes(selectedPart.globalColorId)) {
          return `Selected color not allowed for ${partDef.label} in ${product.name}`
        }
      }
    }
  }

  // Validate fixed mode - customer shouldn't be setting colors
  if (colorMode === 'fixed') {
    if (item.selectedColor || item.selectedColors?.length || item.selectedParts?.length) {
      return `Color selection not allowed for this variant of ${product.name} (colors are pre-set)`
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CheckoutPayload
    const clientRequestedManualQuote = body.manualQuote?.requested === true || body.menuSystem?.checkoutLane === 'manual_quote'
    const hasLogo = hasLogoSvg(body.menuSystem?.walls)
    const customBrandColor = String(body.menuSystem?.customBrandColor ?? '').trim()
    const hasCustomBrandColor = Boolean(customBrandColor)
    if (hasCustomBrandColor && !/^#[0-9a-fA-F]{6}$/.test(customBrandColor)) {
      return NextResponse.json({ error: 'A cor personalizada deve usar um HEX válido.' }, { status: 400 })
    }
    const customerName = String(body.customer?.name ?? '').trim()
    const customerEmail = String(body.customer?.email ?? '').trim().toLowerCase()
    const customerPhone = String(body.customer?.phone ?? '').trim()
    const shippingMethod = body.shipping?.method
    const shippingAddress = String(body.shipping?.address ?? '').trim()
    const notes = String(body.notes ?? '').trim()

    if (customerName.length < 2) return NextResponse.json({ error: 'Indique o seu nome.' }, { status: 400 })
    if (!isEmail(customerEmail)) return NextResponse.json({ error: 'Indique um email válido.' }, { status: 400 })
    if (shippingMethod !== 'pickup_carcavelos' && shippingMethod !== 'mainland_portugal') {
      return NextResponse.json({ error: 'Método de envio inválido.' }, { status: 400 })
    }
    if (shippingMethod === 'mainland_portugal' && shippingAddress.length < 8) {
      return NextResponse.json({ error: 'Indique uma morada completa.' }, { status: 400 })
    }
    if (clientRequestedManualQuote && customerPhone.length < 6) {
      return NextResponse.json({ error: 'Indique o seu telemóvel.' }, { status: 400 })
    }
    if (clientRequestedManualQuote && String(body.manualQuote?.spaceType ?? '').trim().length < 2) {
      return NextResponse.json({ error: 'Indique o tipo de espaço.' }, { status: 400 })
    }
    if (!Array.isArray(body.items) || body.items.length > MAX_ITEMS || (!clientRequestedManualQuote && body.items.length < 1)) {
      return NextResponse.json({ error: 'Carrinho inválido.' }, { status: 400 })
    }

    const orderItems = []
    const lineItems: Stripe.Checkout.SessionCreateParams['line_items'] = []
    const globalColorData = await dbAdmin.query({ globalColors: {} })
    const globalColors = (globalColorData.globalColors ?? []) as GlobalColor[]
    const menuProducts = body.menuSystem ? await getMenuProductColorRecords() : {}
    let menuQuote: MenuQuote | null = null
    let serverWallsBom: ReturnType<typeof getWallsBom> | null = null
    let trustedExtraLetterPackSelections: ExtraLetterPackSelection[] = []
    const menuBaseUnitPrices: MenuBaseUnitPrices = {}
    const effectiveLetterColorPriceAdd = body.menuSystem
      ? getEffectiveLetterColorPriceAdd(globalColors, body.menuSystem)
      : 0

    try {
      const menuValidation = validateMenuPayload(body, globalColors, menuProducts)
      menuQuote = menuValidation.quote
      serverWallsBom = menuValidation.physicalBom
      trustedExtraLetterPackSelections = menuValidation.extraLetterPackSelections
    } catch (menuError) {
      return NextResponse.json(
        { error: menuError instanceof Error ? menuError.message : 'Configuração do menu inválida.' },
        { status: 400 },
      )
    }
    const extraLetterPackSummary = formatExtraLetterPackSummary(trustedExtraLetterPackSelections)

    for (const item of body.items) {
      const slug = String(item.productSlug ?? '').trim()
      const quantity = Number(item.quantity)
      const menuRole = (menuQuote || serverWallsBom) ? getMenuItemRole(slug) : undefined
      const maxQuantityForItem = menuRole ? MAX_MENU_QUANTITY : MAX_QUANTITY
      if (!slug || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantityForItem) {
        return NextResponse.json({ error: 'Um dos artigos é inválido.' }, { status: 400 })
      }

      const product = await getCatalogProductBySlugForBuild(slug)
      const isMenuComponent = Boolean(menuRole)
      if (!product || (product.visible === false && !isMenuComponent)) {
        return NextResponse.json({ error: `Produto indisponível: ${slug}.` }, { status: 404 })
      }

      const variant = getVariant(product, item.selectedVariant)
      if (item.selectedVariant?.id && !variant) {
        return NextResponse.json({ error: `Opção inválida para ${product.name}.` }, { status: 400 })
      }

      // Validate color selections against variant rules
      const colorValidationError = validateSelectedColors(product, item, variant, globalColors)
      if (colorValidationError) {
        return NextResponse.json({ error: colorValidationError }, { status: 400 })
      }

      const rawUnitPrice = getUnitPrice(product, item, globalColors, variant)
      const baseUnitPrice = menuRole === 'standard_pack' || menuRole === 'avulso'
        ? (product.salePrice ?? product.priceFrom) + effectiveLetterColorPriceAdd
        : rawUnitPrice
      if (!Number.isFinite(baseUnitPrice) || baseUnitPrice < 0) {
        return NextResponse.json({ error: `Preço inválido para ${product.name}.` }, { status: 400 })
      }
      if (menuRole) {
        menuBaseUnitPrices[menuRole] = baseUnitPrice
      }

      const unitPrice = menuRole ? discountedMenuUnitPrice(baseUnitPrice) : baseUnitPrice

      const colors = getItemColors(product, item, variant)
      const selectedColorPayload = getSelectedColorPayload(product, item, globalColors, variant)
      const customText = formatCustomText(item.customizations)
      const menuDetails = getMenuItemDetails(menuRole, menuQuote, body.menuSystem, serverWallsBom, trustedExtraLetterPackSelections)
      const itemCustomText = getMenuCustomText(menuRole, menuQuote, customText, serverWallsBom)
      const itemExtraPackSummary = menuRole === 'avulso' && extraLetterPackSummary
        ? `Extras: ${extraLetterPackSummary}`
        : null
      const productDisplayName = menuRole === 'rails' ? 'Módulo Menu 25cm' : product.name

      orderItems.push({
        productId: product.id,
        productName: productDisplayName,
        quantity,
        colors,
        selectedColor: selectedColorPayload.selectedColor,
        selectedColors: selectedColorPayload.selectedColors,
        selectedParts: selectedColorPayload.selectedParts,
        selectedVariant: variant
          ? {
              id: variant.id,
              name: variant.name,
              kind: variant.kind,
              colorMode: variant.colorMode,
              allowedGlobalColorIds: variant.allowedGlobalColorIds,
              colors: variant.colors.map(color => ({
                name: color.name,
                hex: color.hex,
                imageUrl: color.imageUrl,
                globalColorId: color.globalColorId,
                priceAdd: color.priceAdd,
              })),
            }
          : undefined,
        menuSystem: menuDetails,
        customText: itemCustomText,
        unitPrice,
        itemStatus: 'new' as const,
        adminNotes: menuDetails ? JSON.stringify(menuDetails) : '',
        scheduledFor: '',
        quantityDone: 0,
      })

      lineItems.push({
        quantity,
        price_data: {
          currency: 'eur',
          unit_amount: cents(unitPrice),
          product_data: {
            name: productDisplayName,
            description: [
              variant?.name,
              colors.length ? colors.join(', ') : null,
              itemCustomText || null,
              itemExtraPackSummary,
              menuRole ? `Campanha de lançamento -${LAUNCH_DISCOUNT_PERCENT}% aplicada` : null,
            ].filter(Boolean).join(' · ').slice(0, 1000),
          },
        },
      })
    }

    if (menuQuote) {
      menuQuote = calculateMenuQuote({
        rows: menuQuote.lines.map(line => ({
          id: line.id,
          label: line.label,
          detail: line.detail,
          useAccent: line.useAccent,
          moduleCount: line.moduleCount,
          categoryId: line.categoryId,
        })),
        extraLettersText: menuQuote.extraLettersText,
        customIconRequest: menuQuote.customIconRequest,
        globalModuleCount: menuQuote.globalModuleCount,
        standardPackQuantity: menuQuote.standardPackQuantity,
        avulsoCharacterQuantity: menuQuote.avulsoCharacterQuantity,
        railModuleUnitPrice: menuBaseUnitPrices.rails ?? 0,
        standardPackUnitPrice: menuBaseUnitPrices.standard_pack ?? 0,
        avulsoUnitPrice: menuBaseUnitPrices.avulso ?? 0,
        baseLetterColor: sanitizeMenuColor(body.menuSystem?.baseLetterColor ?? body.menuSystem?.letterColor),
        accentLetterColor: sanitizeMenuColor(body.menuSystem?.accentLetterColor ?? body.menuSystem?.baseLetterColor ?? body.menuSystem?.letterColor),
      })

      if (body.menuSystem?.walls?.length) {
        serverWallsBom = getWallsBom({
          walls: body.menuSystem.walls,
          extraLetterGroups: body.menuSystem.extraLetterGroups ?? [],
          baseLetterColor: sanitizeMenuColor(body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
          accentLetterColor: sanitizeMenuColor(body.menuSystem.accentLetterColor ?? body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
          railModuleUnitPrice: menuBaseUnitPrices.rails ?? 0,
          standardPackUnitPrice: menuBaseUnitPrices.standard_pack ?? 0,
          avulsoUnitPrice: menuBaseUnitPrices.avulso ?? 0,
          hasCustomBrandColor,
          forceManualQuote: clientRequestedManualQuote || menuQuote.totalRailModules > 30,
        })
        if (serverWallsBom.hasOverflow) {
          return NextResponse.json({ error: 'Há texto que excede o tamanho da calha física.' }, { status: 400 })
        }
        const expectedQuantities = [
          { slug: MENU_RAIL_SLUG, quantity: serverWallsBom.totalRailModules, label: 'módulos de 25cm' },
          { slug: MENU_PACK_SLUG, quantity: serverWallsBom.standardPackQuantity, label: 'packs standard' },
          { slug: MENU_AVULSO_SLUG, quantity: serverWallsBom.avulsoCharacterQuantity, label: 'letras avulso' },
        ]
        for (const expected of expectedQuantities) {
          if (getMenuItemQuantity(body.items ?? [], expected.slug) !== expected.quantity) {
            return NextResponse.json({ error: `A quantidade de ${expected.label} não corresponde ao cálculo do menu.` }, { status: 400 })
          }
        }
      }

      for (const orderItem of orderItems) {
        const role = orderItem.menuSystem?.role as MenuItemRole | undefined
        if (!role) continue
        const menuDetails = getMenuItemDetails(role, menuQuote, body.menuSystem, serverWallsBom, trustedExtraLetterPackSelections)
        orderItem.menuSystem = menuDetails
        orderItem.adminNotes = menuDetails ? JSON.stringify(menuDetails) : ''
      }
    }

    if (!menuQuote && serverWallsBom && body.menuSystem?.walls?.length) {
      serverWallsBom = getWallsBom({
        walls: body.menuSystem.walls,
        extraLetterPackSelections: trustedExtraLetterPackSelections,
        baseLetterColor: sanitizeMenuColor(body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
        accentLetterColor: sanitizeMenuColor(body.menuSystem.accentLetterColor ?? body.menuSystem.baseLetterColor ?? body.menuSystem.letterColor),
        railModuleUnitPrice: menuBaseUnitPrices.rails ?? 0,
        standardPackUnitPrice: menuBaseUnitPrices.standard_pack ?? 0,
        avulsoUnitPrice: menuBaseUnitPrices.avulso ?? 0,
        hasCustomBrandColor,
        forceManualQuote: clientRequestedManualQuote || serverWallsBom.totalRailModules > 30,
      })

      for (const orderItem of orderItems) {
        const role = orderItem.menuSystem?.role as MenuItemRole | undefined
        if (!role) continue
        const menuDetails = getMenuItemDetails(role, null, body.menuSystem, serverWallsBom, trustedExtraLetterPackSelections)
        orderItem.menuSystem = menuDetails
        orderItem.adminNotes = menuDetails ? JSON.stringify(menuDetails) : ''
      }
    }

    const subtotal = Math.round(orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100) / 100
    const shippingCost = shippingMethod === 'mainland_portugal' ? SHIPPING_COST : 0
    const total = Math.round((subtotal + shippingCost) * 100) / 100
    const serverCheckoutLane: CheckoutLane = (
      clientRequestedManualQuote ||
      (serverWallsBom?.totalRailModules ?? menuQuote?.totalRailModules ?? 0) > 30 ||
      hasCustomBrandColor ||
      hasLogo
    )
      ? 'manual_quote'
      : 'stripe_auto_pay'

    if (body.menuSystem?.checkoutLane === 'stripe_auto_pay' && serverCheckoutLane === 'manual_quote') {
      return NextResponse.json({ error: 'Este projecto precisa de orçamento manual.' }, { status: 400 })
    }

    if (shippingCost > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: cents(shippingCost),
          product_data: {
            name: 'Envio nacional',
            description: 'Entrega em Portugal continental',
          },
        },
      })
    }

    const orderId = id()
    const isMenuFlow = Boolean(menuQuote || serverWallsBom)
    const flow = isMenuFlow ? 'menu_modular' : 'standard_order'

    if (serverCheckoutLane === 'manual_quote') {
      const now = new Date()
      const requestId = id()
      const menuNotes = getMenuOrderNotes(menuQuote, {
        ...body.menuSystem,
        checkoutLane: serverCheckoutLane,
        extraLetterPackSelections: trustedExtraLetterPackSelections,
      }, serverWallsBom)
      const canvasConfig = {
        version: 1,
        type: 'modular-list' as const,
        submittedAt: now.toISOString(),
        checkoutLane: serverCheckoutLane,
        spaceType: String(body.manualQuote?.spaceType ?? '').trim(),
        fontStyle: body.menuSystem?.fontStyle ?? 'classic',
        walls: body.menuSystem?.walls ?? [],
        physicalGrid: body.menuSystem?.physicalGrid ?? [],
        extraLetterPackSelections: trustedExtraLetterPackSelections,
        customBrandColor: String(body.menuSystem?.customBrandColor ?? '').trim() || undefined,
        customBrandColorTarget: body.menuSystem?.customBrandColorTarget === 'rails' ? 'rails' : body.menuSystem?.customBrandColorTarget === 'letters' ? 'letters' : undefined,
        railColor: sanitizeMenuColor(body.menuSystem?.railColor),
        baseLetterColor: sanitizeMenuColor(body.menuSystem?.baseLetterColor ?? body.menuSystem?.letterColor),
        accentLetterColor: sanitizeMenuColor(body.menuSystem?.accentLetterColor ?? body.menuSystem?.baseLetterColor ?? body.menuSystem?.letterColor),
        letterCardColor: sanitizeMenuColor(body.menuSystem?.letterCardColor),
        totals: {
          subtotal,
          shippingCost,
          total,
          totalRailModules: serverWallsBom?.totalRailModules ?? menuQuote?.totalRailModules ?? 0,
          standardPackQuantity: serverWallsBom?.standardPackQuantity ?? menuQuote?.standardPackQuantity ?? 0,
          avulsoCharacterQuantity: serverWallsBom?.avulsoCharacterQuantity ?? menuQuote?.avulsoCharacterQuantity ?? 0,
          characterFrequencyMap: serverWallsBom?.characterFrequencyMap ?? menuQuote?.characterFrequencyMap ?? {},
          characterFrequencyByColor: serverWallsBom?.characterFrequencyByColor ?? menuQuote?.characterFrequencyByColor ?? {},
        },
      }

      await dbAdmin.transact(
        dbAdmin.tx.orderRequests[requestId].update({
          customerName,
          customerEmail,
          customerPhone: customerPhone || undefined,
          productSlug: 'modular-space-planner',
          productName: 'EM3D Modular Space Planner',
          selectedPrice: total,
          estimatedPrice: total,
          canvasConfig,
          leadType: 'b2b',
          isPaid: false,
          notes: [menuNotes, notes].filter(Boolean).join('\n\n'),
          status: 'PENDING_REVIEW',
          createdAt: now,
          updatedAt: now,
        }),
      )

      return NextResponse.json({
        ok: true,
        requestId,
        redirectTo: `${siteUrl()}/checkout/success?request_id=${requestId}`,
      })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe não está configurado.' }, { status: 500 })
    }

    // Create Stripe session first to ensure it succeeds before saving order
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      client_reference_id: orderId,
      success_url: `${siteUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}${isMenuFlow ? '/colecoes/modular/builder' : '/checkout'}`,
      metadata: {
        orderId,
        flow,
        ...(isMenuFlow
          ? {
              railModuleQuantity: String(serverWallsBom?.totalRailModules ?? menuQuote?.totalRailModules ?? 0),
              globalModuleCount: String(menuQuote?.globalModuleCount ?? serverWallsBom?.maxRailModules ?? 0),
              standardPackQuantity: String(serverWallsBom?.standardPackQuantity ?? menuQuote?.standardPackQuantity ?? 0),
              avulsoCharacterQuantity: String(serverWallsBom?.avulsoCharacterQuantity ?? menuQuote?.avulsoCharacterQuantity ?? 0),
              launchDiscountPercent: String(LAUNCH_DISCOUNT_PERCENT),
              ...(extraLetterPackSummary ? { extraLetterPackSummary } : {}),
            }
          : {}),
      },
      line_items: lineItems,
    })

    if (!session.url) {
      throw new Error('Stripe não devolveu URL de checkout.')
    }

    // Now create the order atomically with Stripe session info
    const now = new Date()
    await dbAdmin.transact(
      dbAdmin.tx.orders[orderId].update({
        customerName,
        customerEmail,
        ...(customerPhone ? { customerPhone } : {}),
        paymentPreference: 'stripe',
        shippingMethod,
        ...(shippingMethod === 'mainland_portugal' ? { shippingAddress } : {}),
        items: orderItems,
        subtotal,
        shippingCost,
        total,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'pending',
        fulfillmentStatus: 'new',
        ...(isMenuFlow || notes ? { notes: [getMenuOrderNotes(menuQuote, body.menuSystem ? { ...body.menuSystem, extraLetterPackSelections: trustedExtraLetterPackSelections } : undefined, serverWallsBom), notes].filter(Boolean).join('\n\n') } : {}),
        stripeSessionId: session.id,
        paymentUrl: session.url,
        createdAt: now,
        updatedAt: now,
      }),
    )

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Cart checkout failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.' },
      { status: 500 },
    )
  }
}
