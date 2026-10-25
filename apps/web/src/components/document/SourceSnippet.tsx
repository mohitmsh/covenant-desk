import type { PDFDocumentProxy } from "pdfjs-dist"
import { useEffect, useRef } from "react"
import { PDF_RENDER_SCALE_MAX, SOURCE_SNIPPET_LINE_BAND as LINE_BAND, SOURCE_SNIPPET_WIDTH } from "@/constants"
import type { PageBox } from "@/types"

interface SourceSnippetProps {
  readonly pdf: PDFDocumentProxy
  readonly page: number
  readonly box: PageBox
}

/** A crop of the page around a verified quote, so the source can be read at a glance. */
export function SourceSnippet({ pdf, page, box }: SourceSnippetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Depend on the box's coordinates, not its identity, so a refetch of the same run doesn't re-render.
  const { x, y, width, height } = box

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let cancelRender = () => {}

    const render = async () => {
      const pdfPage = await pdf.getPage(page)
      const base = pdfPage.getViewport({ scale: 1 })
      const left = Math.min(LINE_BAND.left, x)
      const right = Math.max(LINE_BAND.right, x + width)
      const crop = {
        x: left,
        y: Math.max(0, y - LINE_BAND.margin),
        width: right - left,
        height: Math.min(1, height + LINE_BAND.margin * 2)
      }
      const pixelRatio = Math.min(window.devicePixelRatio, PDF_RENDER_SCALE_MAX)
      const scale = (SOURCE_SNIPPET_WIDTH * pixelRatio) / (crop.width * base.width)
      const viewport = pdfPage.getViewport({ scale })

      const full = document.createElement("canvas")
      full.width = Math.ceil(viewport.width)
      full.height = Math.ceil(viewport.height)
      const task = pdfPage.render({ canvas: full, viewport })
      cancelRender = () => task.cancel()
      await task.promise.catch(() => undefined)
      if (cancelled) return

      const sx = crop.x * viewport.width
      const sy = crop.y * viewport.height
      const sw = crop.width * viewport.width
      const sh = crop.height * viewport.height
      canvas.width = Math.round(sw)
      canvas.height = Math.round(sh)
      canvas.getContext("2d")?.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh)
    }

    void render()
    return () => {
      cancelled = true
      cancelRender()
    }
  }, [pdf, page, x, y, width, height])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Source in document"
      style={{ display: "block", width: SOURCE_SNIPPET_WIDTH, maxWidth: "100%", height: "auto" }}
    />
  )
}
