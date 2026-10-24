import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { API_PORT, API_PREFIX } from "#constants"
import { borrowersRoutes } from "#routes/borrowers"
import { portfolioRoutes } from "#routes/portfolio"
import { runsRoutes } from "#routes/runs"
import { runtime } from "#runtime"

const app = new Hono()
  .basePath(API_PREFIX)
  .route("/runs", runsRoutes)
  .route("/borrowers", borrowersRoutes)
  .route("/portfolio", portfolioRoutes)

const server = serve({ fetch: app.fetch, port: API_PORT }, ({ port }) => {
  console.log(`API listening on http://localhost:${port}${API_PREFIX}`)
})

const shutdown = () => server.close(() => void runtime.dispose().then(() => process.exit(0)))
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
