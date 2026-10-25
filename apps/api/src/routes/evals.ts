import { readFile } from "node:fs/promises"
import type { EvalReport } from "@covenant-desk/core"
import { EVALS_DIR } from "@covenant-desk/fixtures/constants"
import { Hono } from "hono"
import { HTTP_STATUS } from "#constants"

/** The latest eval report, written by `npm run eval`. */
export const evalsRoutes = new Hono().get("/", async (c) => {
  const text = await readFile(`${EVALS_DIR}results.json`, "utf8").catch(() => null)
  if (text === null) {
    return c.json(
      { error: { code: "NotFound", message: "No eval results yet. Run `npm run eval`." } },
      HTTP_STATUS.NOT_FOUND
    )
  }
  const report: EvalReport = JSON.parse(text)
  return c.json(report)
})
