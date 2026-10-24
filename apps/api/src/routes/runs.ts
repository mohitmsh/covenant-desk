import {
  approveRun,
  DocumentStore,
  getDocument,
  getRunDetail,
  getRunDocumentId,
  listRuns,
  PDF_CONTENT_TYPE,
  RunIdSchema,
  saveNote,
  type JsonValue
} from "@covenant-desk/core"
import { Effect, Result, Schema } from "effect"
import { Hono } from "hono"
import { toHttpError } from "#http/errors"
import { respondJson } from "#http/respond"
import { runApp } from "#runtime"
import { ApproveRunBodySchema, SaveNoteBodySchema } from "#schemas"
import { startAgentRun } from "#services/start-agent-run"

const decodeRunId = Schema.decodeUnknownEffect(RunIdSchema)
const decodeApproveBody = Schema.decodeUnknownEffect(ApproveRunBodySchema)
const decodeSaveNoteBody = Schema.decodeUnknownEffect(SaveNoteBodySchema)

const FORM_FIELDS = { BORROWER: "borrowerId", FILE: "file" } as const

export const runsRoutes = new Hono()
  .get("/", (c) => respondJson(c, listRuns))
  .post("/", async (c) => {
    const form = await c.req.parseBody()
    const borrowerId = form[FORM_FIELDS.BORROWER]
    const file = form[FORM_FIELDS.FILE]
    const upload =
      file instanceof File && file.size > 0
        ? { filename: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }
        : null
    return respondJson(c, startAgentRun(typeof borrowerId === "string" ? borrowerId : "", upload))
  })
  .get("/:runId", (c) => respondJson(c, Effect.flatMap(decodeRunId(c.req.param("runId")), getRunDetail)))
  .get("/:runId/document", async (c) => {
    const result = await runApp(
      Effect.gen(function* () {
        const runId = yield* decodeRunId(c.req.param("runId"))
        const document = yield* getDocument(yield* getRunDocumentId(runId))
        const store = yield* DocumentStore
        return { document, bytes: yield* store.get(document.storageKey) }
      })
    )
    if (Result.isFailure(result)) {
      const { status, body } = toHttpError(result.failure)
      return c.json(body, status)
    }
    const { document, bytes } = result.success
    return c.body(bytes, 200, {
      "Content-Type": PDF_CONTENT_TYPE,
      "Content-Disposition": `inline; filename="${document.filename}"`,
      "Cache-Control": "private, max-age=31536000, immutable"
    })
  })
  .post("/:runId/notes", async (c) => {
    const json = await c.req.json<JsonValue>()
    return respondJson(
      c,
      Effect.gen(function* () {
        const runId = yield* decodeRunId(c.req.param("runId"))
        const { body, author } = yield* decodeSaveNoteBody(json)
        const version = yield* saveNote(runId, body, author)
        return { version }
      })
    )
  })
  .post("/:runId/approve", async (c) => {
    const json = await c.req.json<JsonValue>()
    return respondJson(
      c,
      Effect.gen(function* () {
        const runId = yield* decodeRunId(c.req.param("runId"))
        const { approver } = yield* decodeApproveBody(json)
        yield* approveRun(runId, approver)
        return yield* getRunDetail(runId)
      })
    )
  })
