'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Download,
  Upload,
  FileJson,
  Package,
  Palette,
  ClipboardList,
  Megaphone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  Eye,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  exportData,
  importData,
  validateImportData,
  type ExportableEntity,
} from './actions'

// ─── Entity config ───────────────────────────────────────────────────
const ENTITIES: {
  key: ExportableEntity
  label: string
  icon: LucideIcon
  description: string
}[] = [
  { key: 'catalogProducts', label: 'Products', icon: Package, description: 'All catalog products and variants' },
  { key: 'globalColors', label: 'Colors', icon: Palette, description: 'Global filament color palette' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, description: 'Customer orders and fulfillment' },
  { key: 'marketingPosts', label: 'Posts', icon: Megaphone, description: 'Marketing posts and campaigns' },
]

function detectEntityFromFilename(filename: string): ExportableEntity | null {
  const lower = filename.toLowerCase()
  if (lower.includes('catalogproducts') || lower.includes('products')) return 'catalogProducts'
  if (lower.includes('globalcolors') || lower.includes('colors')) return 'globalColors'
  if (lower.includes('orders')) return 'orders'
  if (lower.includes('marketingposts') || lower.includes('posts')) return 'marketingPosts'
  return null
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  // ─── Export state ──────────────────────────────────────────────────
  const [exportingEntity, setExportingEntity] = useState<ExportableEntity | null>(null)

  // ─── Import state ──────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importRecords, setImportRecords] = useState<Record<string, unknown>[] | null>(null)
  const [importEntity, setImportEntity] = useState<ExportableEntity | null>(null)
  const [isDryRun, setIsDryRun] = useState(true)
  const [importLoading, setImportLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // ─── Export handler ────────────────────────────────────────────────
  const handleExport = useCallback(async (entity: ExportableEntity) => {
    setExportingEntity(entity)
    try {
      const result = await exportData(entity)
      const date = new Date().toISOString().split('T')[0]
      downloadJson(result.data, `foto3d.pt-${entity}-backup-${date}.json`)
      toast.success(`Exported ${result.count} ${entity} records`)
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`)
    } finally {
      setExportingEntity(null)
    }
  }, [])

  // ─── File drop / select ────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a .json file')
      return
    }
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        const records = Array.isArray(raw) ? raw : raw.data && Array.isArray(raw.data) ? raw.data : null
        if (!records) {
          toast.error('JSON must be an array or contain a "data" array.')
          return
        }
        setImportRecords(records)
        const detected = detectEntityFromFilename(file.name)
        if (detected) setImportEntity(detected)
      } catch {
        toast.error('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
  }, [processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0])
  }, [processFile])

  // ─── Import handler ────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!importEntity || !importRecords) return
    setImportLoading(true)
    try {
      if (isDryRun) {
        const validation = await validateImportData(importEntity, importRecords)
        if (validation.valid) {
          toast.success(`Dry run passed: ${validation.count} records valid for ${importEntity}`, {
            icon: <ShieldCheck className="h-4 w-4" />,
          })
        } else {
          toast.error(`Validation failed: ${validation.errors.join(', ')}`)
        }
      } else {
        setShowConfirmDialog(true)
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`)
    } finally {
      setImportLoading(false)
    }
  }, [importEntity, importRecords, isDryRun])

  const confirmImport = useCallback(async () => {
    if (!importEntity || !importRecords) return
    setShowConfirmDialog(false)
    setImportLoading(true)
    try {
      const result = await importData(importEntity, importRecords)
      toast.success(`Successfully imported ${result.imported} records into ${result.entity}`)
      clearImport()
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`)
    } finally {
      setImportLoading(false)
    }
  }, [importEntity, importRecords])

  const clearImport = () => {
    setImportFile(null)
    setImportRecords(null)
    setImportEntity(null)
    setIsDryRun(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const entityLabel = ENTITIES.find(e => e.key === importEntity)?.label ?? importEntity

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Backup, restore, and manage your database records.
        </p>
      </div>

      {/* ─── Export Section ─────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Export Data</CardTitle>
              <CardDescription>Download entity data as JSON backup files</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {ENTITIES.map(entity => {
              const Icon = entity.icon
              const isExporting = exportingEntity === entity.key
              return (
                <button
                  key={entity.key}
                  onClick={() => handleExport(entity.key)}
                  disabled={isExporting}
                  className="group flex items-center gap-4 rounded-xl border border-border/60 bg-background/50 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm disabled:opacity-60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10">
                    {isExporting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Export {entity.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{entity.description}</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Import Section ─────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Upload className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Import / Restore</CardTitle>
              <CardDescription>Upload a JSON backup file to restore or upsert records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-primary/30 hover:bg-secondary/30'
            }`}
          >
            <FileJson className={`h-10 w-10 ${dragActive ? 'text-primary' : 'text-muted-foreground/40'}`} />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {importFile ? importFile.name : 'Drop a JSON file here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">Accepts .json files exported from this panel</p>
            </div>
            {importFile && (
              <Badge variant="secondary" className="gap-1.5">
                <FileJson className="h-3 w-3" />
                {(importFile.size / 1024).toFixed(1)} KB
              </Badge>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Loaded file controls */}
          {importRecords && (
            <>
              <Separator />

              <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
                {/* Entity selector */}
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-sm font-medium">Target Entity</Label>
                  <Select
                    value={importEntity ?? ''}
                    onValueChange={(v) => setImportEntity(v as ExportableEntity)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITIES.map(e => (
                        <SelectItem key={e.key} value={e.key}>{e.label} ({e.key})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="gap-1">
                    {importRecords.length} records
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={clearImport}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Preview first 3 records */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    Preview (first 3 records)
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-lg border border-border/40 bg-background p-3 text-xs text-muted-foreground">
                    {JSON.stringify(importRecords.slice(0, 3), null, 2)}
                  </pre>
                </div>

                {/* Dry run toggle */}
                <div className="flex items-center gap-3">
                  <Switch
                    id="dry-run"
                    checked={isDryRun}
                    onCheckedChange={setIsDryRun}
                  />
                  <Label htmlFor="dry-run" className="text-sm">
                    Dry run {isDryRun ? <Badge variant="outline" className="ml-1.5 text-xs">Validate only</Badge> : <Badge variant="destructive" className="ml-1.5 text-xs">Will write data</Badge>}
                  </Label>
                </div>

                {/* Import / Validate button */}
                <Button
                  onClick={handleImport}
                  disabled={!importEntity || importLoading}
                  className="w-full"
                  variant={isDryRun ? 'outline' : 'default'}
                >
                  {importLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isDryRun ? (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isDryRun ? 'Validate (Dry Run)' : `Import ${importRecords.length} records`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Confirmation Dialog ────────────────────────────────── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Import
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to import <strong>{importRecords?.length ?? 0}</strong> records
                into <strong>{entityLabel}</strong>.
              </p>
              <p className="text-amber-600">
                This will overwrite any existing records that share the same ID. This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmImport}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {importLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Confirm Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
