import { useEffect, type RefObject } from "react"

/** Calls `onDismiss` on Escape or on a pointer press outside `ref`. */
export const useDismiss = (ref: RefObject<HTMLElement | null>, onDismiss: () => void, active: boolean) => {
  useEffect(() => {
    if (!active) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [ref, onDismiss, active])
}
