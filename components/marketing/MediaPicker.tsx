'use client'

import { useState, useMemo } from 'react'
import { db } from '@/lib/db'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Search, ImageIcon, Loader2, Folder, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface MediaPickerProps {
  onSelect: (url: string) => void
  trigger?: React.ReactNode
}

export function MediaPicker({ onSelect, trigger }: MediaPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [currentPath, setCurrentPath] = useState<string[]>([])

  const query = db.useQuery({ $files: {} })
  const files = query.data?.$files ?? []

  const filteredFiles = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return (files as any[]).filter(file => 
      (file.path ?? '').toLowerCase().includes(needle) || 
      (file.url ?? '').toLowerCase().includes(needle)
    )
  }, [files, search])

  const { visibleFolders, visibleFiles } = useMemo(() => {
    const prefix = currentPath.length > 0 ? currentPath.join('/') + '/' : ''
    const folderSet = new Set<string>()
    const fileList: any[] = []

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" type="button">
            <Search className="mr-2 h-4 w-4" />
            Browse
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9" 
            placeholder="Search files..." 
          />
        </div>

        <div className="flex items-center gap-2 mb-2 text-sm">
          <button 
            onClick={() => setCurrentPath([])}
            className={`hover:text-primary transition-colors ${currentPath.length === 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
          >
            Root
          </button>
          {currentPath.map((part, i) => (
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

        <div className="flex-1 overflow-y-auto pr-2">
          {query.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No files found in this folder.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleFolders.length > 0 && (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {visibleFolders.map(folder => (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => setCurrentPath([...currentPath, folder])}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-2 hover:border-primary hover:bg-primary/5 transition-all group text-center"
                    >
                      <Folder className="h-8 w-8 text-primary/60 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] font-medium truncate w-full px-1">{folder}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {visibleFiles.map(file => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => {
                      if (file.url) {
                        onSelect(file.url)
                        setOpen(false)
                      }
                    }}
                    className="group relative aspect-square overflow-hidden rounded-md border border-border hover:border-primary transition-colors"
                  >
                    {file.url ? (
                      <img 
                        src={file.url} 
                        alt="" 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-secondary">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="truncate text-[10px] text-white text-center">{file.path?.split('/').pop()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
