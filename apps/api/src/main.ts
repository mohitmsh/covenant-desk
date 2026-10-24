import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { API_PORT, API_PREFIX, WEB_DIST_DIR } from "#constants"
import { borrowersRoutes } from "#routes/borrowers"
import { portfolioRoutes } from "#routes/portfolio"
import { runsRoutes } from "#routes/runs"
import { runtime } from "#runtime"

const app = new Hono()
  .basePath(API_PREFIX)
  .route("/runs", runsRoutes)
  .route("/borrowers", borrowersRoutes)
  .route("/portfolio", portfolioRoutes)

const root = new Hono().route("/", app)
if (WEB_DIST_DIR) {
  // Hashed assets are served as files; every other path is a client route and gets index.html.
  root.use("*", serveStatic({ root: WEB_DIST_DIR }))
  root.get("*", serveStatic({ root: WEB_DIST_DIR, path: "index.html" }))
}

const server = serve({ fetch: root.fetch, port: API_PORT }, ({ port }) => {
  console.log(`API listening on http://localhost:${port}${API_PREFIX}`)
})

const shutdown = () => server.close(() => void runtime.dispose().then(() => process.exit(0)))
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
