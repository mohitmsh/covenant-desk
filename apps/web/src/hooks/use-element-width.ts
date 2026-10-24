import { useEffect, useState, type RefObject } from "react"

/** Tracks the content width of an element. */
export const useElementWidth = (ref: RefObject<HTMLElement | null>): number => {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
