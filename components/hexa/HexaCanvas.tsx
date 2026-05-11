
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { computeHoneycomb, HEX_CLIP, layoutBounds, normalizeHoneycomb } from "@/lib/hexa-helpers";
import { HEXA_COLORS, HEXA_SIZES, HexaSize, HexaTile } from "@/types/hexa";

export function HexaCanvas({
  tiles,
  selectedId,
  mosaicSize,
  availableColors,
  onSelect,
}: {
  tiles: HexaTile[]
  selectedId: string
  mosaicSize: HexaSize
  availableColors: { name: string; hex: string }[]
  onSelect: (id: string) => void
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 560 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [userZoom, setUserZoom] = useState(1)
  const positioned = useMemo(() => normalizeHoneycomb(computeHoneycomb(tiles, mosaicSize), mosaicSize), [tiles, mosaicSize])
  const bounds = useMemo(() => layoutBounds(positioned, mosaicSize), [positioned, mosaicSize])
  const autoFitScale = Math.min(
    1.1,
    Math.max(0.18, Math.min((canvasSize.width - 56) / bounds.width, (canvasSize.height - 56) / bounds.height)),
  )
  const scale = autoFitScale * userZoom
  const groupWidth = bounds.width * scale
  const groupHeight = bounds.height * scale
  const offsetX = (canvasSize.width - groupWidth) / 2
  const offsetY = (canvasSize.height - groupHeight) / 2

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const update = () => setCanvasSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function resetView() {
    setPan({ x: 0, y: 0 })
    setUserZoom(1)
  }

  return (
    <div
      ref={canvasRef}
      className="relative h-screen min-h-[360px] overflow-hidden rounded-lg border border-[#d8c8ae] bg-[#f5ead9] shadow-inner"
      style={{
        backgroundImage:
          'linear-gradient(rgba(70,55,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(70,55,36,0.08) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }}
    >
      <div className="absolute right-3 top-3 z-20 flex w-44 flex-col gap-2 rounded-md border border-border bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#6e5b43]">Zoom {Math.round(userZoom * 100)}%</span>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={resetView}>
            Centrar
          </Button>
        </div>
        <Slider min={0.6} max={1.6} step={0.05} value={[userZoom]} onValueChange={(value) => setUserZoom(value[0] ?? 1)} />
      </div>

      <motion.div
        drag
        dragMomentum={false}
        className="absolute cursor-grab touch-none active:cursor-grabbing"
        style={{
          left: offsetX,
          top: offsetY,
          width: groupWidth,
          height: groupHeight,
          x: pan.x,
          y: pan.y,
        }}
        onDragEnd={(_, info) => setPan((current) => ({ x: current.x + info.offset.x, y: current.y + info.offset.y }))}
      >
        {positioned.map((tile) => {
          const frameColor = availableColors.find((color) => color.name === tile.color)?.hex || HEXA_COLORS.Preto.hex
          const width = HEXA_SIZES[mosaicSize].width * scale
          const height = HEXA_SIZES[mosaicSize].height * scale
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect(tile.id)}
              className={cn(
                'absolute overflow-hidden border-[5px] shadow-lg transition-all duration-300 ease-out',
                selectedId === tile.id ? 'ring-4 ring-primary ring-offset-2 ring-offset-[#f5ead9]' : 'ring-0',
              )}
              style={{
                left: tile.x * scale,
                top: tile.y * scale,
                width,
                height,
                clipPath: HEX_CLIP,
                borderColor: frameColor,
                backgroundColor: frameColor,
              }}
              aria-label="Selecionar peça hexagonal"
            >
              {tile.photoPreviewUrl ? (
                <img
                  src={tile.photoPreviewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                  style={{
                    transform: `scale(${tile.photoAdjustments.zoom}) translate(${tile.photoAdjustments.offsetX * 100}%, ${tile.photoAdjustments.offsetY * 100}%)`,
                    transformOrigin: 'center',
                  }}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[#efe3d0] text-xs font-semibold text-[#8b7b66]">
                  Foto
                </span>
              )}
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}