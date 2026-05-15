export type DeskMode = 'view' | 'edit' | 'focus'
export type DeskSurface = 'top'
export type DeskRotation = 0 | 90 | 180 | 270
export type DeskSnapSize = 5 | 10
export type DeskPreviewShape = 'dock' | 'circle' | 'tray' | 'hook'
export type DeskPreviewIcon = 'smartphone' | 'pen' | 'tray' | 'headphones'

export type DeskColorName =
  | 'Preto Fosco'
  | 'Branco Stormtrooper'
  | 'Madeira Walnut'
  | 'Neon Lime'
  | 'Pulse Blue'

export type DeskProductId =
  | 'magsafe_dock_v1'
  | 'pen_holder_v1'
  | 'desk_tray_v1'
  | 'headphone_stand_v1'

export type DeskProductCategory = 'Carregamento' | 'Organização' | 'Arrumação' | 'Áudio'

export type DeskCustomFieldValue = string | number | boolean

export type DeskCustomFieldOption = {
  value: string
  label: string
  priceAdd?: number
  footprintCm?: {
    width: number
    depth: number
  }
}

export type DeskCustomFieldBase = {
  key: string
  label: string
  defaultValue: DeskCustomFieldValue
}

export type DeskChoiceCustomField = DeskCustomFieldBase & {
  type: 'select' | 'segmented'
  defaultValue: string
  options: DeskCustomFieldOption[]
}

export type DeskBooleanCustomField = DeskCustomFieldBase & {
  type: 'boolean'
  defaultValue: boolean
}

export type DeskNumberCustomField = DeskCustomFieldBase & {
  type: 'number'
  defaultValue: number
  min: number
  max: number
  step?: number
  priceAdd?: number
}

export type DeskCustomFieldDefinition =
  | DeskChoiceCustomField
  | DeskBooleanCustomField
  | DeskNumberCustomField

export type DeskItem = {
  id: string
  productId: string
  xCm: number
  yCm: number
  rotation: DeskRotation
  zIndex?: number
  colorBase?: string
  colorAccent?: string
  customConfig?: Record<string, unknown>
}

export type DeskSetup = {
  type: 'desk-setup'
  schemaVersion: 1
  surface: DeskSurface
  mode: DeskMode
  desk: {
    widthCm: number
    depthCm: number
    surfaceColor: string
    showGrid: boolean
    snapToGrid: boolean
    snapSizeCm: DeskSnapSize
  }
  selectedItemId?: string
  items: DeskItem[]
  createdAt: string
  updatedAt: string
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export type DeskProductDefinition = {
  productId: DeskProductId
  name: string
  category: DeskProductCategory
  description: string
  price: number
  footprintCm: {
    width: number
    depth: number
  }
  defaultColors: {
    base: DeskColorName
    accent: DeskColorName
  }
  allowedColors: {
    base: DeskColorName[]
    accent: DeskColorName[]
  }
  preview: {
    shape: DeskPreviewShape
    icon: DeskPreviewIcon
  }
  validation: {
    allowedSurfaces: DeskSurface[]
    maxQuantity?: number
  }
  customFields?: DeskCustomFieldDefinition[]
  generator: {
    type: 'openscad'
    moduleId: string
    moduleName: string
    version: 'v1'
  }
}

export type DeskPricing = {
  itemsPrice: number
  setupDiscount: number
  totalPrice: number
}
