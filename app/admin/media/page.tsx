'use client'

import { useMemo, useRef, useState } from 'react'
import { Copy, Folder, HardDrive, Loader2, Search, Trash2, ChevronRight, Upload, X } from 'lucide-react'
import { db } from '@/lib/db'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CatalogProductRecord, ProductVariantOption } from '@/lib/products'
import { MediaPicker } from '@/components/marketing/MediaPicker'

type FileRecord = {
  id: string
  path?: string
  url?: string
  size?: number
}

const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024

function formatBytes(bytes?: number) {
  if (!bytes) return 'Unknown'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function collectProductImageUrls(product: CatalogProductRecord) {
  return [
    product.image,
    ...(product.images ?? []),
    ...((product.variants ?? []) as ProductVariantOption[]).map(variant => variant.image),
  ]
    .map(url => String(url ?? '').trim())
    .filter(Boolean)
}

export default function AdminMediaPage() {
  const [search, setSearch] = useState('')
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [currentPath, setCurrentPath] = useState<string[]>([])

  // InstantDB upload
  const uploadInstantRef = useRef<HTMLInputElement>(null);

  // R2 State
  const [r2Files, setR2Files] = useState<FileRecord[]>([])
  const [isR2Loading, setIsR2Loading] = useState(false)
  const [r2Path, setR2Path] = useState<string[]>([])
  const [isUploadingR2, setIsUploadingR2] = useState(false)
  const [r2Search, setR2Search] = useState('')

  const query = db.useQuery({
    $files: {},
    catalogProducts: {},
  })

  const files = useMemo(() => (query.data?.$files ?? []) as FileRecord[], [query.data?.$files])
  const products = useMemo(() => (query.data?.catalogProducts ?? []) as CatalogProductRecord[], [query.data?.catalogProducts])

  const usedUrls = useMemo(() => {
    return new Set(products.flatMap(collectProductImageUrls))
  }, [products])

  const knownBytes = useMemo(
    () => files.reduce((sum, file) => sum + (typeof file.size === 'number' ? file.size : 0), 0),
    [files],
  )
  const knownPercent = Math.min(100, (knownBytes / STORAGE_LIMIT_BYTES) * 100)

  const filteredFiles = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return files

    return files.filter(file => {
      const haystack = `${file.path ?? ''} ${file.url ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [files, search])

  const unusedCount = files.filter(file => file.url && !usedUrls.has(file.url)).length

  const { visibleFolders, visibleFiles } = useMemo(() => {
    const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '/'
    const folderSet = new Set<string>()
    const fileList: FileRecord[] = []

    filteredFiles.forEach(file => {
      const path = file.path ?? ''
      if (path.startsWith(prefix)) {
        const relative = path.slice(prefix.length)
        const parts = relative.split('/')
        if (parts.length > 1) {
          folderSet.add(parts[0])
        } else {
          fileList.push(file)
        }
      }
    })

    return {
      visibleFolders: Array.from(folderSet).sort(),
      visibleFiles: fileList
    }
  }, [filteredFiles, currentPath])

  const { r2VisibleFolders, r2VisibleFiles } = useMemo(() => {
    const prefix = r2Path.length > 0 ? r2Path.join('/') + '/' : ''
    const folderSet = new Set<string>()
    const fileList: FileRecord[] = []

    const r2Filtered = r2Files.filter(f => 
      f.path?.toLowerCase().includes(r2Search.toLowerCase())
    )

    r2Filtered.forEach(file => {
      const path = file.path ?? ''
      if (path.startsWith(prefix)) {
        const relative = path.slice(prefix.length)
        const parts = relative.split('/')
        if (parts.length > 1) {
          folderSet.add(parts[0])
        } else {
          fileList.push(file)
        }
      }
    })

    return {
      r2VisibleFolders: Array.from(folderSet).sort(),
      r2VisibleFiles: fileList
    }
  }, [r2Files, r2Path, r2Search])

  useEffect(() => {
    fetchR2Files()
  }, [])

  const fetchR2Files = async () => {
    setIsR2Loading(true)
    try {
      const res = await fetch('/api/media/r2')
      const data = await res.json()
      if (data.files) {
        setR2Files(data.files)
      }
    } catch (err) {
      console.error('Failed to fetch R2 files:', err)
      toast.error('Failed to load Cloudflare files')
    } finally {
      setIsR2Loading(false)
    }
  }

  const handleFileUpload = async (file: File, path: string) => {
    setIsUploadingR2(true)
    try {
      const fileName = `${path}/${file.name}`
      const { data } = await db.storage.uploadFile(fileName, file)
      toast.success('Uploaded to InstantDB')
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error('Failed to upload file')
    } finally {
      setIsUploadingR2(false)
    }
  }

  const handleR2Upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingR2(true)
    try {
      const prefix = r2Path.length > 0 ? r2Path.join('/') + '/' : ''
      const fileName = `${prefix}${Date.now()}-${file.name}`
      
      const res = await fetch('/api/media/r2', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileType: file.type })
      })
      const { signedUrl } = await res.json()

      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      toast.success('Uploaded to Cloudflare')
      fetchR2Files()
    } catch (err) {
      console.error('R2 upload failed:', err)
      toast.error('Upload failed')
    } finally {
      setIsUploadingR2(false)
    }
  }

  const deleteR2File = async (key: string) => {
    if (!confirm('Are you sure you want to delete this file from Cloudflare?')) return

    try {
      const res = await fetch('/api/media/r2', {
        method: 'DELETE',
        body: JSON.stringify({ key })
      })
      if (res.ok) {
        toast.success('Deleted from Cloudflare')
        fetchR2Files()
      }
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error('Delete failed')
    }
  }

  const deleteFile = async () => {
    if (!fileToDelete?.path) return

    setIsDeleting(true)
    setError('')
    try {
      await db.storage.delete(fileToDelete.path)
      setFileToDelete(null)
    } catch (err) {
      console.error('Failed to delete media file:', err)
      setError('Could not delete this file. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = async (value?: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media</h1>
          <p className="text-sm text-muted-foreground">Manage storage files and product image references.</p>
        </div>
      </div>

      <Tabs defaultValue="instant" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="instant">Instant Storage</TabsTrigger>
          <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
        </TabsList>

        <TabsContent value="instant" className="space-y-6 mt-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Known usage</p>
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{formatBytes(knownBytes)}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${knownPercent}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{knownPercent.toFixed(1)}% of 1 GB</p>
            </div>

          <section className="grid grid-cols-2 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Files</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{files.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">{filteredFiles.length} currently visible.</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Unused</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{unusedCount}</p>
              <p className="mt-2 text-xs text-muted-foreground">By products or variants.</p>
            </div>
          </section>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64 flex-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button
                type="button"
                variant="outline"
                onClick={() => uploadInstantRef.current?.click()}
                className="flex-1"
                disabled={isUploadingR2}
              >
                {isUploadingR2 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload
              </Button>
            <div className="hidden">
              <input
                type="file"
                id={`media-upload-instant`}
                className='sr-only'
                ref={uploadInstantRef}
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file, currentPath.join('/'))
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-sm">
            <button 
              onClick={() => setCurrentPath([''])}
              className={`hover:text-primary transition-colors`}
            >
              Home
            </button>
            {currentPath.filter(part => part !== '').map((part, i) => (
              <div key={i} className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button
                  onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                  className={`hover:text-primary transition-colors ${i === currentPath.length - 1 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
                >
                  {part}
                </button>
              </div>
            ))}
          </div>

          <section className="flex flex-wrap gap-4 mb-8">
            {visibleFolders.map(folder => (
              <button
                key={folder}
                onClick={() => setCurrentPath([...currentPath, folder])}
                className="flex max-w-48 items-center gap-2 rounded-lg border border-border bg-background p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-all group text-center"
              >
                <Folder className="h-6 w-6 text-primary/60 group-hover:text-primary transition-colors" />
                <span className="text-md font-medium truncate w-full px-2">{folder}</span>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {visibleFiles.map(file => {
              const isUsed = Boolean(file.url && usedUrls.has(file.url))
              const canDelete = Boolean(file.path && !isUsed)

              return (
                <article key={file.id} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  <div className="relative aspect-[4/3] bg-secondary">
                    {file.url ? (
                      <img src={file.url} alt={file.path ?? 'Storage file'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <HardDrive className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <Badge className="absolute left-2 top-2" variant={isUsed ? 'default' : 'secondary'}>
                      {isUsed ? 'Used' : 'Unused'}
                    </Badge>
                  </div>
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="truncate text-sm font-semibold text-foreground" title={file.path}>{file.path?.split('/').pop() ?? 'Unknown'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => copyToClipboard(file.url)} disabled={!file.url}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        URL
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setFileToDelete(file)}
                        disabled={!canDelete}
                        title={isUsed ? 'File is still referenced' : 'Delete file'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          {visibleFolders.length === 0 && visibleFiles.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
              This folder is empty.
            </div>
          )}
        </TabsContent>

        <TabsContent value="cloudflare" className="space-y-6 border-none p-0 outline-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Cloudflare..."
                  className="pl-9"
                  value={r2Search}
                  onChange={e => setR2Search(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchR2Files} disabled={isR2Loading}>
                <Loader2 className={`h-4 w-4 ${isR2Loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="r2-upload"
                className="hidden"
                onChange={handleR2Upload}
                accept="image/*,video/*"
              />
              <Button onClick={() => document.getElementById('r2-upload')?.click()} disabled={isUploadingR2}>
                {isUploadingR2 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload to R2
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-sm">
            <button 
              onClick={() => setR2Path([])}
              className={`hover:text-primary transition-colors ${r2Path.length === 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
            >
              Home
            </button>
            {r2Path.map((part, i) => (
              <div key={i} className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button
                  onClick={() => setR2Path(r2Path.slice(0, i + 1))}
                  className={`hover:text-primary transition-colors ${i === r2Path.length - 1 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
                >
                  {part}
                </button>
              </div>
            ))}
          </div>

          {isR2Loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-4 lg:grid-cols-6 mb-8">
                {r2VisibleFolders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => setR2Path([...r2Path, folder])}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background p-4 shadow-sm hover:border-primary hover:bg-primary/5 transition-all group text-center"
                  >
                    <Folder className="h-6 w-6 text-primary/60 group-hover:text-primary transition-colors" />
                    <span className="text-md font-medium truncate w-full px-2">{folder}</span>
                  </button>
                ))}
              </section>

              <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {r2VisibleFiles.map(file => (
                  <article key={file.id} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                    <div className="relative aspect-[4/3] bg-secondary">
                      {file.url ? (
                        <img src={file.url} alt={file.path ?? 'R2 file'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <HardDrive className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 p-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-foreground" title={file.path}>{file.path?.split('/').pop() ?? 'Unknown'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => copyToClipboard(file.url)} disabled={!file.url}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          URL
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteR2File(file.path!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              {r2VisibleFolders.length === 0 && r2VisibleFiles.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
                  No files found in Cloudflare R2.
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(fileToDelete)} onOpenChange={open => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete unused file?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file from Instant Storage. It is currently not referenced by any product image or variant image URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFile} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
