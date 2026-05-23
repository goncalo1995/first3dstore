'use client'

import { AlertTriangle, Layers3, PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  buildModularProductionBom,
  formatCharacterCounts,
  type ModularProductionBom as ModularProductionBomData,
} from '@/lib/modular-production-bom'

function ColorSwatch({ hex }: { hex?: string }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-border shadow-sm"
      style={{ backgroundColor: hex || '#d1d5db' }}
      aria-hidden="true"
    />
  )
}

function BomContent({ bom }: { bom: ModularProductionBomData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-md border bg-secondary/40 p-3">
          <p className="font-semibold uppercase tracking-widest text-muted-foreground">Fonte STL</p>
          <p className="mt-1 text-sm font-bold text-foreground">{bom.fontStyle}</p>
        </div>
        <div className="rounded-md border bg-secondary/40 p-3">
          <p className="font-semibold uppercase tracking-widest text-muted-foreground">Calhas</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-foreground">
            <ColorSwatch hex={bom.railColorHex} />
            {bom.railColorName}
          </p>
        </div>
        <div className="rounded-md border bg-secondary/40 p-3">
          <p className="font-semibold uppercase tracking-widest text-muted-foreground">25cm rails</p>
          <p className="mt-1 text-sm font-bold text-foreground">{bom.totalRailModules}</p>
        </div>
        <div className="rounded-md border bg-secondary/40 p-3">
          <p className="font-semibold uppercase tracking-widest text-muted-foreground">Letras</p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {bom.standardPackQuantity} pack / {bom.avulsoCharacterQuantity} avulso
          </p>
        </div>
      </div>

      {bom.walls.length > 0 ? (
        <div className="space-y-3">
          {bom.walls.map((wall) => (
            <div key={wall.id} className="overflow-hidden rounded-lg border bg-background">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-secondary/50 p-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Parede {wall.index}
                  </p>
                  <h4 className="mt-1 text-base font-bold text-foreground">{wall.name}</h4>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{wall.railModules} calhas 25cm</Badge>
                  {wall.type === 'logo' && <Badge variant="secondary">Logo</Badge>}
                </div>
              </div>

              <div className="grid gap-3 p-3 lg:grid-cols-[1fr_220px]">
                <div className="space-y-3">
                  {wall.colorGroups.length > 0 ? wall.colorGroups.map((group) => (
                    <div key={group.key} className="rounded-md border bg-secondary/25 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <ColorSwatch hex={group.colorHex} />
                          Imprimir em {group.colorName}
                        </p>
                        <Badge variant="outline">{group.totalLetters} letras</Badge>
                      </div>
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                        {formatCharacterCounts(group.characters)}
                      </p>
                    </div>
                  )) : (
                    <div className="rounded-md border border-dashed bg-secondary/25 p-3 text-sm text-muted-foreground">
                      Sem letras nesta parede.
                    </div>
                  )}

                  {wall.requiresManualCad && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        Logótipo Personalizado - Modelação CAD Manual Necessária
                      </p>
                      {wall.logoSvgUrl && (
                        <a href={wall.logoSvgUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-semibold underline">
                          Abrir SVG do logótipo
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-md border bg-secondary/25 p-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mapa físico</p>
                  <div className="space-y-2">
                    {wall.rows.flatMap(row => row.columns.map(column => (
                      <div key={`${row.index}-${column.index}`} className="rounded border bg-background p-2 text-xs">
                        <p className="font-bold text-foreground">L{row.index} C{column.index}: {column.railModules}x 25cm</p>
                        <p className="mt-1 truncate text-muted-foreground">{[column.leftText, column.rightText].filter(Boolean).join(' / ') || '-'}</p>
                      </div>
                    )))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : bom.legacyColorGroups.length > 0 ? (
        <div className="space-y-2">
          {bom.legacyColorGroups.map(group => (
            <div key={group.key} className="rounded-md border bg-secondary/25 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <ColorSwatch hex={group.colorHex} />
                Imprimir em {group.colorName}
              </div>
              <p className="font-mono text-xs text-muted-foreground">{formatCharacterCounts(group.characters)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {bom.extraLetterGroups.length > 0 && (
        <div className="rounded-lg border bg-secondary/25 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">Letras extra</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {bom.extraLetterGroups.map(group => (
              <div key={`${group.label}-${group.colorName}`} className="flex items-center justify-between gap-3 rounded-md border bg-background p-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <ColorSwatch hex={group.colorHex} />
                  <span className="truncate font-semibold">{group.label}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{group.quantity}x {group.charactersPerUnit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ModularProductionBom({ record }: { record: any }) {
  const bom = buildModularProductionBom(record)
  if (!bom) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-primary" />
          BOM de Produção Modular
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BomContent bom={bom} />
      </CardContent>
    </Card>
  )
}

export function ModularProductionBomInline({ record }: { record: any }) {
  const bom = buildModularProductionBom(record)
  if (!bom) return null

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-foreground">BOM Modular</p>
      </div>
      <BomContent bom={bom} />
    </div>
  )
}
