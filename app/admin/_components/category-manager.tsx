'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Edit3, Eye, EyeOff, FolderPlus, Loader2, Plus, Trash2, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, id } from '@/lib/db'
import { normalizeCategorySlug, normalizeCategorySlugs } from '@/lib/products'
import type { CategoryRecord } from '../types'

const defaultCategories: Omit<CategoryRecord, 'id' | 'updatedAt'>[] = [
  { slug: 'on-course', label: 'No Campo', description: 'Acessórios para levar na volta', sortOrder: 10, visible: true },
  { slug: 'practice', label: 'Treino', description: 'Ajudas e acessórios para praticar', sortOrder: 20, visible: true },
  { slug: 'gifts', label: 'Presentes', description: 'Peças úteis para oferecer a golfistas', sortOrder: 30, visible: true },
  { slug: 'custom', label: 'Personalizáveis', description: 'Produtos que aceitam texto ou iniciais', sortOrder: 40, visible: true },
  { slug: 'ready-stock', label: 'Em stock', description: 'Peças já impressas para envio mais rápido', sortOrder: 50, visible: true },
]

export function CategoryManager({ categories }: { categories: CategoryRecord[] }) {
  const [isAdding, setIsAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('60')
  const [visible, setVisible] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const sortedCategories = useMemo(() => {
    return [...categories].sort((left, right) => {
      if ((left.sortOrder ?? 999) !== (right.sortOrder ?? 999)) return (left.sortOrder ?? 999) - (right.sortOrder ?? 999)
      return left.label.localeCompare(right.label)
    })
  }, [categories])

  const resetForm = () => {
    setLabel('')
    setSlug('')
    setDescription('')
    setSortOrder('60')
    setVisible(true)
  }

  const seedDefaults = async () => {
    setIsSaving(true)
    try {
      const existing = new Set(categories.map(category => category.slug))
      const missingDefaults = defaultCategories.filter(category => !existing.has(category.slug))
      if (missingDefaults.length === 0) return

      await db.transact(
        missingDefaults.map(category => db.tx.productCategories[id()].update({ ...category, updatedAt: new Date() })),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanSlug = normalizeCategorySlug(slug || label)
    if (!cleanSlug) return

    setIsSaving(true)
    try {
      await db.transact(
        db.tx.productCategories[id()].update({
          slug: cleanSlug,
          label: label.trim() || cleanSlug,
          description: description.trim(),
          sortOrder: Number(sortOrder) || 99,
          visible,
          updatedAt: new Date(),
        }),
      )
      resetForm()
      setIsAdding(false)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCategory = async (category: CategoryRecord) => {
    const linkedProducts = Array.from(
      new Map([
        ...(category.products ?? []),
        ...(category.primaryProducts ?? []),
      ].filter(product => product.id).map(product => [product.id, product])),
    ).map(([, product]) => product)

    const confirmed = window.confirm(
      linkedProducts.length
        ? `Delete category ${category.label} and remove it from ${linkedProducts.length} product(s)?`
        : `Delete category ${category.label}?`,
    )
    if (!confirmed) return

    await db.transact([
      ...linkedProducts.map(product => {
        const nextCategorySlugs = normalizeCategorySlugs([
          ...(product.categorySlugs ?? []),
          product.category,
        ]).filter(categorySlug => categorySlug !== category.slug)
        const nextPrimaryCategory = product.category === category.slug
          ? nextCategorySlugs[0] ?? ''
          : product.category

        return db.tx.catalogProducts[product.id].update({
          category: nextPrimaryCategory,
          categorySlugs: nextCategorySlugs,
          updatedAt: new Date(),
        }).unlink({
          categories: category.id,
          primaryCategory: category.id,
        })
      }),
      db.tx.productCategories[category.id].delete(),
    ])
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Categories</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Organize catalog shelves. Product assignment happens inside each product editor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={seedDefaults} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Seed launch categories
          </Button>
          <Button type="button" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      <Dialog open={isAdding} onOpenChange={(open) => {
        setIsAdding(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
          </DialogHeader>
          <form onSubmit={addCategory} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-category-label">Label</Label>
                <Input
                  id="new-category-label"
                  value={label}
                  onChange={event => {
                    setLabel(event.target.value)
                    if (!slug) setSlug(normalizeCategorySlug(event.target.value))
                  }}
                  placeholder="Practice"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-category-slug">Slug</Label>
                <Input
                  id="new-category-slug"
                  value={slug}
                  onChange={event => setSlug(normalizeCategorySlug(event.target.value))}
                  placeholder="practice"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-description">Description</Label>
              <Input
                id="new-category-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Ajudas e acessórios para praticar"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="new-category-sort">Order</Label>
                <Input
                  id="new-category-sort"
                  type="number"
                  min="1"
                  value={sortOrder}
                  onChange={event => setSortOrder(event.target.value)}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={event => setVisible(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Visible in public shop
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {sortedCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center">
          <FolderPlus className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No categories yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Create the first category or seed the launch set to start organizing the catalog.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sortedCategories.map(category => (
            <CategoryItem
              key={category.id}
              category={category}
              onDelete={() => deleteCategory(category)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryItem({
  category,
  onDelete
}: {
  category: CategoryRecord;
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    label: category.label,
    slug: category.slug,
    description: category.description ?? '',
    sortOrder: category.sortOrder ?? 99,
    visible: category.visible ?? true
  })

  useEffect(() => {
    if (isEditing) return
    setDraft({
      label: category.label,
      slug: category.slug,
      description: category.description ?? '',
      sortOrder: category.sortOrder ?? 99,
      visible: category.visible ?? true
    })
  }, [category, isEditing])

  const linkedProductCount = useMemo(() => {
    return new Set([
      ...(category.products ?? []).map(product => product.id),
      ...(category.primaryProducts ?? []).map(product => product.id),
    ].filter(Boolean)).size
  }, [category.products, category.primaryProducts])

  const hasChanges = useMemo(() => {
    return draft.label !== category.label ||
           draft.slug !== category.slug ||
           draft.description !== (category.description ?? '') ||
           draft.sortOrder !== (category.sortOrder ?? 99) ||
           draft.visible !== (category.visible ?? true)
  }, [draft, category])

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await db.transact(
        db.tx.productCategories[category.id].update({
          ...draft,
          updatedAt: new Date(),
        })
      )
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft({
      label: category.label,
      slug: category.slug,
      description: category.description ?? '',
      sortOrder: category.sortOrder ?? 99,
      visible: category.visible ?? true
    })
    setIsEditing(false)
  }

  return (
    <article className={`rounded-lg border bg-background p-4 shadow-sm transition-all ${isEditing ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {isEditing ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label htmlFor={`${category.id}-label`}>Label</Label>
                <Input
                  id={`${category.id}-label`}
                  value={draft.label}
                  onChange={event => setDraft(current => ({ ...current, label: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${category.id}-sort`}>Order</Label>
                <Input
                  id={`${category.id}-sort`}
                  type="number"
                  min="1"
                  value={draft.sortOrder}
                  onChange={event => setDraft(current => ({ ...current, sortOrder: Number(event.target.value) || 99 }))}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">{category.label}</h3>
                <Badge variant={category.visible ? 'secondary' : 'outline'} className="h-5 px-1.5 text-[10px]">
                  {category.visible ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                  {category.visible ? 'Visible' : 'Hidden'}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">/{category.slug}</p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!isEditing ? (
            <>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)} aria-label={`Edit ${category.label}`}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${category.label}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="icon" onClick={handleCancel} disabled={isSaving} aria-label="Cancel editing">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${category.id}-slug`}>Slug</Label>
            <Input
              id={`${category.id}-slug`}
              value={draft.slug}
              onChange={event => setDraft(current => ({ ...current, slug: normalizeCategorySlug(event.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${category.id}-description`}>Description</Label>
            <Input
              id={`${category.id}-description`}
              value={draft.description}
              onChange={event => setDraft(current => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={event => setDraft(current => ({ ...current, visible: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Visible in public shop
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 min-h-5 text-sm text-muted-foreground">{category.description || 'No description yet.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-secondary p-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Products</p>
              <p className="mt-1 font-semibold text-foreground">{linkedProductCount}</p>
            </div>
            <div className="rounded-md bg-secondary p-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Order</p>
              <p className="mt-1 font-semibold text-foreground">{category.sortOrder ?? 99}</p>
            </div>
          </div>
        </>
      )}
    </article>
  )
}
