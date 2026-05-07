import type { CatalogRecord, CategoryRecord } from './types'

export function getCategoryIdsForSlugs(categories: CategoryRecord[], slugs: string[]) {
  const wanted = new Set(slugs)
  return categories.filter(category => wanted.has(category.slug)).map(category => category.id)
}

export function linkCatalogRelations<TTransaction>(
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

export function getCatalogCategoryIds(catalogProduct?: CatalogRecord) {
  return catalogProduct?.categories?.flatMap(category => category.id ? [category.id] : []) ?? []
}

export function getCatalogPrimaryCategoryId(catalogProduct?: CatalogRecord) {
  return catalogProduct?.primaryCategory?.id
}
