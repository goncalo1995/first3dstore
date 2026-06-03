'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  EXTRA_LETTER_PACKS,
  type ExtraLetterPackId,
  type ExtraLetterPackSelection,
} from './modular-inventory-config'
import { sanitizeMenuText } from './menu-calculator'
import {
  clampRailModules,
  inferRailModulesForText,
  type FontStyle,
  type PhysicalColumn,
  type PhysicalRow,
  type PhysicalRowLayoutRole,
  type PhysicalWall,
  type RailAlign,
  type TextAlign,
} from './modular-physical-grid'
import type { ProductColor } from './products'

export const BUILDER_STORAGE_KEY = 'em3d-modular-builder-active'
export const GENERATED_WALLS_STORAGE_KEY = 'em3d-modular-planner-walls-v1'
export const BUILDER_TOAST_STORAGE_KEY = 'em3d-modular-builder-toast'
export const MAX_COLUMNS_PER_ROW = 6
export const MAX_ROW_GAP_AFTER_CM = 30

export type CustomBrandColorTarget = 'rails' | 'letters'

export type BuilderDraftActive = {
  version: 5
  walls: PhysicalWall[]
  activeWallId: string
  fontStyle: FontStyle
  railColor?: ProductColor
  baseLetterColor?: ProductColor
  accentLetterColor?: ProductColor
  letterCardColor?: ProductColor
  customBrandColor?: string
  customBrandColorTarget?: CustomBrandColorTarget
  extraLetterPackSelections: ExtraLetterPackSelection[]
  customerName: string
  customerEmail: string
  customerPhone: string
  spaceType: string
  shippingMethod: 'pickup_carcavelos' | 'mainland_portugal'
  shippingAddress: string
  notes: string
}

let idCounter = 0

export function makeBuilderId(prefix: string) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

export function createColumn({
  id,
  kind,
  leftText,
  rightText = '',
  railModules,
  railAlign,
  textAlign,
}: {
  id?: string
  kind: 'title' | 'item'
  leftText: string
  rightText?: string
  railModules?: number
  railAlign: RailAlign
  textAlign: TextAlign
}): PhysicalColumn {
  return {
    id: id ?? makeBuilderId('col'),
    kind,
    railModules: railModules ?? inferRailModulesForText(leftText, rightText),
    leftText,
    rightText,
    railAlign,
    textAlign,
  }
}

export function createRow(columns: PhysicalColumn[], id?: string, meta: Omit<PhysicalRow, 'id' | 'columns'> = {}): PhysicalRow {
  return {
    id: id ?? makeBuilderId('row'),
    columns,
    ...meta,
  }
}

export function createTitleRow(title: string, railModules = 2, id?: string, columnId?: string) {
  const text = sanitizeMenuText(title).replace(/\s+/g, ' ').trim().toUpperCase()
  return createRow([
    createColumn({
      id: columnId,
      kind: 'title',
      leftText: text,
      railModules: Math.max(railModules, inferRailModulesForText(text)),
      railAlign: 'center',
      textAlign: 'center',
    }),
  ], id, { layoutRole: 'title', sectionName: text })
}

export function createItemRow(leftText: string, rightText: string, railModules = 2, railAlign: RailAlign = 'left') {
  return createRow([
    createColumn({
      kind: 'item',
      leftText,
      rightText,
      railModules: Math.max(railModules, inferRailModulesForText(leftText, rightText)),
      railAlign,
      textAlign: 'left',
    }),
  ], undefined, { layoutRole: 'list' })
}

export function createDefaultWalls(): PhysicalWall[] {
  return [
    {
      id: 'main-wall',
      name: 'Parede Principal',
      type: 'text',
      maxWidthCm: 200,
      rows: [
        createTitleRow('Entradas', 2, 'main-wall-row-entradas-title', 'main-wall-col-entradas-title'),
        createRow([
          createColumn({ id: 'main-wall-col-sopa', kind: 'item', leftText: 'SOPA DO DIA', rightText: '3,50€', railModules: 2, railAlign: 'left', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-bruschetta', kind: 'item', leftText: 'BRUSCHETTA', rightText: '5,00€', railModules: 2, railAlign: 'center', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-tabua-mini', kind: 'item', leftText: 'TÁBUA MINI', rightText: '8,00€', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ], 'main-wall-row-entradas-items', { layoutRole: 'grid', sectionName: 'Entradas' }),
        createTitleRow('Pratos', 2, 'main-wall-row-pratos-title', 'main-wall-col-pratos-title'),
        createRow([
          createColumn({ id: 'main-wall-col-bacalhau', kind: 'item', leftText: 'BACALHAU DA CASA', rightText: '14,50€', railModules: 3, railAlign: 'left', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-risotto', kind: 'item', leftText: 'RISOTTO', rightText: '13,00€', railModules: 2, railAlign: 'center', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-bife', kind: 'item', leftText: 'BIFE GRELHADO', rightText: '16,00€', railModules: 3, railAlign: 'right', textAlign: 'left' }),
        ], 'main-wall-row-pratos-items', { layoutRole: 'grid', sectionName: 'Pratos' }),
        createTitleRow('Sobremesas', 2, 'main-wall-row-sobremesas-title', 'main-wall-col-sobremesas-title'),
        createRow([
          createColumn({ id: 'main-wall-col-mousse', kind: 'item', leftText: 'MOUSSE', rightText: '4,00€', railModules: 2, railAlign: 'left', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-pudim', kind: 'item', leftText: 'PUDIM', rightText: '4,50€', railModules: 2, railAlign: 'center', textAlign: 'left' }),
          createColumn({ id: 'main-wall-col-cafe', kind: 'item', leftText: 'CAFÉ', rightText: '1,20€', railModules: 1, railAlign: 'right', textAlign: 'left' }),
        ], 'main-wall-row-sobremesas-items', { layoutRole: 'grid', sectionName: 'Sobremesas' }),
      ],
    },
    {
      id: 'signal-wall',
      name: 'Sinalética',
      type: 'text',
      rows: [
        createRow([
          createColumn({ id: 'signal-wall-col-wc', kind: 'title', leftText: 'WC', railModules: 1, railAlign: 'left', textAlign: 'center' }),
          createColumn({ id: 'signal-wall-col-aberto', kind: 'item', leftText: 'ABERTO', rightText: '09-19H', railModules: 2, railAlign: 'right', textAlign: 'left' }),
        ], 'signal-wall-row-main', { layoutRole: 'grid', sectionName: 'Sinalética' }),
      ],
    },
  ]
}

export function createEmptyWall(index: number): PhysicalWall {
  const name = `Parede ${index}`
  return {
    id: makeBuilderId('wall'),
    name,
    type: 'text',
    rows: [createTitleRow(name, 2)],
  }
}

function cloneColumn(column: PhysicalColumn, index: number): PhysicalColumn {
  return {
    ...column,
    id: makeBuilderId(`col-${index + 1}`),
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function cleanAlign(value: unknown): RailAlign | TextAlign | undefined {
  return value === 'left' || value === 'center' || value === 'right' || value === 'justify'
    ? value
    : undefined
}

function cleanLayoutRole(value: unknown): PhysicalRowLayoutRole | undefined {
  return value === 'title' || value === 'list' || value === 'grid' ? value : undefined
}

function normalizeColumn(value: unknown, index: number): PhysicalColumn | null {
  if (!isObject(value)) return null
  const leftText = sanitizeMenuText(String(value.leftText ?? '')).slice(0, 160)
  const rightText = sanitizeMenuText(String(value.rightText ?? '')).slice(0, 120)
  const kind = value.kind === 'title' ? 'title' : 'item'
  const railAlign = cleanAlign(value.railAlign) ?? (kind === 'title' ? 'center' : 'left')
  const textAlign = cleanAlign(value.textAlign) ?? (kind === 'title' ? 'center' : 'left')

  return {
    id: String(value.id ?? `column-${index}`),
    kind,
    railModules: clampRailModules(Number(value.railModules ?? inferRailModulesForText(leftText, rightText))),
    leftText,
    rightText,
    railAlign,
    textAlign,
    colorOverride: typeof value.colorOverride === 'string' ? value.colorOverride : undefined,
  }
}

export function normalizeRows(value: unknown): PhysicalRow[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row, rowIndex) => {
      if (!isObject(row)) return null
      const columns = Array.isArray(row.columns)
        ? row.columns.map(normalizeColumn).filter((column): column is PhysicalColumn => Boolean(column))
        : []
      if (!columns.length) return null
      const gapAfterCm = Number(row.gapAfterCm)
      return {
        id: String(row.id ?? `row-${rowIndex}`),
        columns,
        ...(Number.isFinite(gapAfterCm) && gapAfterCm > 0 ? { gapAfterCm: Math.max(0, Math.min(200, gapAfterCm)) } : {}),
        ...(typeof row.sectionName === 'string' && row.sectionName.trim() ? { sectionName: row.sectionName.trim().slice(0, 80) } : {}),
        ...(cleanLayoutRole(row.layoutRole) ? { layoutRole: cleanLayoutRole(row.layoutRole) } : {}),
      }
    })
    .filter((row): row is PhysicalRow => Boolean(row))
}

export function normalizeWalls(value: unknown): PhysicalWall[] {
  if (!Array.isArray(value)) return []
  return value
    .map((wall, wallIndex): PhysicalWall | null => {
      if (!isObject(wall)) return null
      const type = wall.type === 'logo' ? 'logo' : 'text'
      const rows = type === 'logo' ? [] : normalizeRows(wall.rows)
      if (type === 'text' && !rows.length) return null
      const normalizedWall: PhysicalWall = {
        id: String(wall.id ?? `wall-${wallIndex + 1}`),
        name: String(wall.name ?? `Parede ${wallIndex + 1}`).trim() || `Parede ${wallIndex + 1}`,
        type,
        maxWidthCm: Number.isFinite(Number(wall.maxWidthCm)) ? Number(wall.maxWidthCm) : undefined,
        rows,
        logoSvgUrl: typeof wall.logoSvgUrl === 'string' ? wall.logoSvgUrl : undefined,
        logoSvgText: typeof wall.logoSvgText === 'string' ? wall.logoSvgText : undefined,
      }
      return normalizedWall
    })
    .filter((wall): wall is PhysicalWall => Boolean(wall))
}

export function normalizeDraftColor(value: unknown): ProductColor | undefined {
  if (!isObject(value)) return undefined
  const name = String(value.name ?? '').trim()
  if (!name) return undefined
  return {
    name,
    hex: typeof value.hex === 'string' ? value.hex : '#d1d5db',
    globalColorId: typeof value.globalColorId === 'string' ? value.globalColorId : undefined,
    priceAdd: Number.isFinite(Number(value.priceAdd)) ? Number(value.priceAdd) : undefined,
  }
}

export function normalizeCustomBrandColorTarget(value: unknown): CustomBrandColorTarget {
  return value === 'rails' ? 'rails' : 'letters'
}

export function isExtraLetterPackId(value: unknown): value is ExtraLetterPackId {
  return typeof value === 'string' && value in EXTRA_LETTER_PACKS
}

export function toExtraLetterPackColor(color: ProductColor | undefined): ExtraLetterPackSelection['color'] | undefined {
  if (!color?.globalColorId) return undefined
  return {
    globalColorId: color.globalColorId,
    hex: color.hex ?? '#d1d5db',
    name: color.name,
    priceAdd: color.priceAdd,
  }
}

export function normalizeExtraLetterPackSelections(value: unknown): ExtraLetterPackSelection[] {
  if (!Array.isArray(value)) return []
  return value
    .map((selection, index) => {
      if (!isObject(selection) || !isExtraLetterPackId(selection.packId)) return null
      const color = normalizeDraftColor(selection.color)
      const packColor = toExtraLetterPackColor(color)
      const quantity = Math.trunc(Number(selection.quantity) || 0)
      if (!packColor || quantity < 1) return null
      return {
        id: String(selection.id ?? `extra-pack-${index}`),
        packId: selection.packId,
        color: packColor,
        quantity,
      }
    })
    .filter((selection): selection is ExtraLetterPackSelection => Boolean(selection))
}

export function createDefaultDraft(walls: PhysicalWall[]): BuilderDraftActive {
  return {
    version: 5,
    walls,
    activeWallId: walls[0]?.id ?? 'main-wall',
    fontStyle: 'classic',
    extraLetterPackSelections: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    spaceType: '',
    shippingMethod: 'pickup_carcavelos',
    shippingAddress: '',
    notes: '',
  }
}

export function readInitialDraft(): BuilderDraftActive {
  if (typeof window !== 'undefined') {
    try {
      const activeRaw = window.localStorage.getItem(BUILDER_STORAGE_KEY)
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw) as unknown
        if (isObject(parsed) && parsed.version === 5) {
          const walls = normalizeWalls(parsed.walls)
          const activeWallId = String(parsed.activeWallId ?? walls[0]?.id ?? '')
          if (walls.length && walls.some(wall => wall.id === activeWallId)) {
            return {
              version: 5,
              walls,
              activeWallId,
              fontStyle: parsed.fontStyle === 'modern' ? 'modern' : 'classic',
              railColor: normalizeDraftColor(parsed.railColor),
              baseLetterColor: normalizeDraftColor(parsed.baseLetterColor),
              accentLetterColor: normalizeDraftColor(parsed.accentLetterColor),
              letterCardColor: normalizeDraftColor(parsed.letterCardColor),
              customBrandColor: typeof parsed.customBrandColor === 'string' ? parsed.customBrandColor : undefined,
              customBrandColorTarget: normalizeCustomBrandColorTarget(parsed.customBrandColorTarget),
              extraLetterPackSelections: normalizeExtraLetterPackSelections(parsed.extraLetterPackSelections),
              customerName: String(parsed.customerName ?? ''),
              customerEmail: String(parsed.customerEmail ?? ''),
              customerPhone: String(parsed.customerPhone ?? ''),
              spaceType: String(parsed.spaceType ?? ''),
              shippingMethod: parsed.shippingMethod === 'mainland_portugal' ? 'mainland_portugal' : 'pickup_carcavelos',
              shippingAddress: String(parsed.shippingAddress ?? ''),
              notes: String(parsed.notes ?? ''),
            }
          }
        }
      }

      const generatedRaw = window.localStorage.getItem(GENERATED_WALLS_STORAGE_KEY)
      if (generatedRaw) {
        const parsed = JSON.parse(generatedRaw) as unknown
        const walls = isObject(parsed) ? normalizeWalls(parsed.walls) : []
        window.localStorage.removeItem(GENERATED_WALLS_STORAGE_KEY)
        if (walls.length) {
          return {
            ...createDefaultDraft(walls),
            activeWallId: walls[0].id,
          }
        }
      }
    } catch {
      // Invalid localStorage should fall through to the clean default template.
    }
  }

  return createDefaultDraft(createDefaultWalls())
}

export function useModularBuilderState() {
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [walls, setWalls] = useState<PhysicalWall[]>(() => createDefaultWalls())
  const [activeWallId, setActiveWallId] = useState('main-wall')
  const [fontStyle, setFontStyle] = useState<FontStyle>('classic')
  const [extraLetterPackSelections, setExtraLetterPackSelections] = useState<ExtraLetterPackSelection[]>([])
  const [railColor, setRailColor] = useState<ProductColor | undefined>()
  const [baseLetterColor, setBaseLetterColor] = useState<ProductColor | undefined>()
  const [accentLetterColor, setAccentLetterColor] = useState<ProductColor | undefined>()
  const [letterCardColor, setLetterCardColor] = useState<ProductColor | undefined>()
  const [customBrandColor, setCustomBrandColor] = useState('')
  const [customBrandColorTarget, setCustomBrandColorTarget] = useState<CustomBrandColorTarget>('letters')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [spaceType, setSpaceType] = useState('')
  const [shippingMethod, setShippingMethod] = useState<'pickup_carcavelos' | 'mainland_portugal'>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const draft = readInitialDraft()
    setWalls(draft.walls)
    setActiveWallId(draft.activeWallId)
    setFontStyle(draft.fontStyle)
    setRailColor(draft.railColor)
    setBaseLetterColor(draft.baseLetterColor)
    setAccentLetterColor(draft.accentLetterColor)
    setLetterCardColor(draft.letterCardColor)
    setCustomBrandColor(draft.customBrandColor ?? '')
    setCustomBrandColorTarget(draft.customBrandColorTarget ?? 'letters')
    setExtraLetterPackSelections(draft.extraLetterPackSelections)
    setCustomerName(draft.customerName)
    setCustomerEmail(draft.customerEmail)
    setCustomerPhone(draft.customerPhone)
    setSpaceType(draft.spaceType)
    setShippingMethod(draft.shippingMethod)
    setShippingAddress(draft.shippingAddress)
    setNotes(draft.notes)
    setDraftHydrated(true)
  }, [])

  const addWall = useCallback(() => {
    setWalls(current => {
      const nextWall = createEmptyWall(current.length + 1)
      setActiveWallId(nextWall.id)
      return [...current, nextWall]
    })
  }, [])

  const removeWall = useCallback((wallId: string) => {
    setWalls(current => {
      if (current.length <= 1) return current
      const next = current.filter(wall => wall.id !== wallId)
      if (wallId === activeWallId) setActiveWallId(next[0]?.id ?? '')
      return next
    })
  }, [activeWallId])

  const renameWall = useCallback((wallId: string, name: string) => {
    const sanitized = sanitizeMenuText(name).replace(/\s+/g, ' ').trim().slice(0, 80)
    setWalls(current => current.map(wall => (
      wall.id === wallId ? { ...wall, name: sanitized } : wall
    )))
  }, [])

  const updateActiveWall = useCallback((updater: (wall: PhysicalWall) => PhysicalWall) => {
    setWalls(current => current.map(wall => (wall.id === activeWallId ? updater(wall) : wall)))
  }, [activeWallId])

  const addTitleRow = useCallback(() => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return { ...wall, rows: [...wall.rows, createTitleRow('Novo título', 1)] }
    })
  }, [updateActiveWall])

  const addItemRow = useCallback(() => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return { ...wall, rows: [...wall.rows, createItemRow('Novo item', '0,00€', 2)] }
    })
  }, [updateActiveWall])

  const removeRow = useCallback((rowId: string) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo' || wall.rows.length <= 1) return wall
      return { ...wall, rows: wall.rows.filter(row => row.id !== rowId) }
    })
  }, [updateActiveWall])

  const duplicateRow = useCallback((rowId: string) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      const rowIndex = wall.rows.findIndex(row => row.id === rowId)
      if (rowIndex < 0) return wall
      const source = wall.rows[rowIndex]
      const duplicate: PhysicalRow = {
        ...source,
        id: makeBuilderId('row'),
        sectionName: source.sectionName ? `${source.sectionName} cópia`.slice(0, 80) : source.sectionName,
        columns: source.columns.map(cloneColumn),
      }
      return {
        ...wall,
        rows: [
          ...wall.rows.slice(0, rowIndex + 1),
          duplicate,
          ...wall.rows.slice(rowIndex + 1),
        ],
      }
    })
  }, [updateActiveWall])

  const updateRowGapAfterCm = useCallback((rowId: string, gapAfterCm: number) => {
    const nextGap = Math.max(0, Math.min(MAX_ROW_GAP_AFTER_CM, Math.round(Number(gapAfterCm) || 0)))
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => (
          row.id === rowId
            ? { ...row, gapAfterCm: nextGap > 0 ? nextGap : undefined }
            : row
        )),
      }
    })
  }, [updateActiveWall])

  const updateRowSectionName = useCallback((rowId: string, sectionName: string) => {
    const sanitized = sanitizeMenuText(sectionName).replace(/\s+/g, ' ').trim().slice(0, 80)
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => (
          row.id === rowId ? { ...row, sectionName: sanitized || undefined } : row
        )),
      }
    })
  }, [updateActiveWall])

  const addColumnToRow = useCallback((rowId: string) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => {
          if (row.id !== rowId || row.columns.length >= MAX_COLUMNS_PER_ROW) return row
          return {
            ...row,
            layoutRole: row.columns.length >= 1 ? 'grid' : row.layoutRole,
            columns: [
              ...row.columns,
              createColumn({
                kind: 'item',
                leftText: 'Novo item',
                rightText: '0,00€',
                railModules: 2,
                railAlign: 'left',
                textAlign: 'left',
              }),
            ],
          }
        }),
      }
    })
  }, [updateActiveWall])

  const removeColumn = useCallback((rowId: string, columnId: string) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => {
          if (row.id !== rowId || row.columns.length <= 1) return row
          return { ...row, columns: row.columns.filter(column => column.id !== columnId) }
        }),
      }
    })
  }, [updateActiveWall])

  const updateColumnText = useCallback((rowId: string, columnId: string, field: 'leftText' | 'rightText', value: string) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => {
          if (row.id !== rowId) return row
          return {
            ...row,
            columns: row.columns.map(column => {
              if (column.id !== columnId) return column
              const sanitized = sanitizeMenuText(value).slice(0, field === 'leftText' ? 160 : 120)
              const leftText = field === 'leftText' ? sanitized : String(column.leftText ?? '')
              const rightText = column.kind === 'title' ? '' : field === 'rightText' ? sanitized : String(column.rightText ?? '')
              return { ...column, leftText: leftText || '', rightText: rightText || '' }
            }),
          }
        }),
      }
    })
  }, [updateActiveWall])

  const updateColumnModules = useCallback((rowId: string, columnId: string, value: number) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => {
          if (row.id !== rowId) return row
          return {
            ...row,
            columns: row.columns.map(column => (
              column.id === columnId ? { ...column, railModules: clampRailModules(value) } : column
            )),
          }
        }),
      }
    })
  }, [updateActiveWall])

  const updateColumnAlignment = useCallback((rowId: string, columnId: string, field: 'railAlign' | 'textAlign', value: RailAlign | TextAlign) => {
    updateActiveWall(wall => {
      if (wall.type === 'logo') return wall
      return {
        ...wall,
        rows: wall.rows.map(row => {
          if (row.id !== rowId) return row
          return {
            ...row,
            columns: row.columns.map(column => (
              column.id === columnId ? { ...column, [field]: value } : column
            )),
          }
        }),
      }
    })
  }, [updateActiveWall])

  const addExtraLetterPack = useCallback((packColor: ExtraLetterPackSelection['color']) => {
    setExtraLetterPackSelections(current => [
      ...current,
      { id: makeBuilderId('extra-pack'), packId: 'numbers', color: packColor, quantity: 1 },
    ])
  }, [])

  const removeExtraLetterPack = useCallback((selectionId: string) => {
    setExtraLetterPackSelections(current => current.filter(selection => selection.id !== selectionId))
  }, [])

  const updateExtraLetterPack = useCallback((
    selectionId: string,
    updater: (selection: ExtraLetterPackSelection) => ExtraLetterPackSelection,
  ) => {
    setExtraLetterPackSelections(current => current.map(selection => {
      if (selection.id !== selectionId) return selection
      const next = updater(selection)
      return { ...selection, ...next, quantity: Math.max(1, Math.trunc(Number(next.quantity) || 1)) }
    }))
  }, [])

  return {
    draftHydrated,
    walls,
    setWalls,
    activeWallId,
    setActiveWallId,
    fontStyle,
    setFontStyle,
    extraLetterPackSelections,
    setExtraLetterPackSelections,
    railColor,
    setRailColor,
    baseLetterColor,
    setBaseLetterColor,
    accentLetterColor,
    setAccentLetterColor,
    letterCardColor,
    setLetterCardColor,
    customBrandColor,
    setCustomBrandColor,
    customBrandColorTarget,
    setCustomBrandColorTarget,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    spaceType,
    setSpaceType,
    shippingMethod,
    setShippingMethod,
    shippingAddress,
    setShippingAddress,
    notes,
    setNotes,
    addWall,
    removeWall,
    renameWall,
    updateActiveWall,
    addTitleRow,
    addItemRow,
    removeRow,
    duplicateRow,
    updateRowGapAfterCm,
    updateRowSectionName,
    addColumnToRow,
    removeColumn,
    updateColumnText,
    updateColumnModules,
    updateColumnAlignment,
    addExtraLetterPack,
    removeExtraLetterPack,
    updateExtraLetterPack,
  }
}

export function usePersistModularBuilderDraft({
  draftHydrated,
  walls,
  activeWallId,
  fontStyle,
  railColor,
  baseLetterColor,
  accentLetterColor,
  letterCardColor,
  customBrandColor,
  customBrandColorTarget,
  extraLetterPackSelections,
  customerName,
  customerEmail,
  customerPhone,
  spaceType,
  shippingMethod,
  shippingAddress,
  notes,
}: Omit<BuilderDraftActive, 'version'> & { draftHydrated: boolean }) {
  useEffect(() => {
    if (!draftHydrated) return
    const draft: BuilderDraftActive = {
      version: 5,
      walls,
      activeWallId,
      fontStyle,
      railColor,
      baseLetterColor,
      accentLetterColor,
      letterCardColor,
      customBrandColor,
      customBrandColorTarget,
      extraLetterPackSelections,
      customerName,
      customerEmail,
      customerPhone,
      spaceType,
      shippingMethod,
      shippingAddress,
      notes,
    }
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(draft))
  }, [
    activeWallId,
    accentLetterColor,
    baseLetterColor,
    customBrandColor,
    customBrandColorTarget,
    customerEmail,
    customerName,
    customerPhone,
    draftHydrated,
    extraLetterPackSelections,
    fontStyle,
    letterCardColor,
    notes,
    railColor,
    shippingAddress,
    shippingMethod,
    spaceType,
    walls,
  ])
}
