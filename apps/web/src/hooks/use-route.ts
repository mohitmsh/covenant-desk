import { useCallback, useEffect, useState } from "react"
import { RUN_QUERY_PARAM } from "@/constants"
import type { Route } from "@/types"

const readRoute = (): Route => {
  const runId = new URLSearchParams(window.location.search).get(RUN_QUERY_PARAM)
  return runId ? { view: "run", runId } : { view: "portfolio" }
}

const toUrl = (route: Route): string => {
  const url = new URL(window.location.href)
  url.search = route.view === "run" ? `?${RUN_QUERY_PARAM}=${route.runId}` : ""
  return url.toString()
}

/** Current screen, kept in the URL so it survives reloads and can be shared. */
export const useRoute = () => {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onPopState = () => setRoute(readRoute())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navigate = useCallback((next: Route, options: { readonly replace?: boolean } = {}) => {
    if (options.replace) window.history.replaceState(null, "", toUrl(next))
    else window.history.pushState(null, "", toUrl(next))
    setRoute(next)
  }, [])

  return { route, navigate }
}
