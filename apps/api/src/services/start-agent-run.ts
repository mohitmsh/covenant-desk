import { readFile } from "node:fs/promises"
import { driveAgent, prepareRun } from "@covenant-desk/agent/run"
import { hasActiveAgentRun, NotFound } from "@covenant-desk/core"
import { PACKS_DIR } from "@covenant-desk/fixtures/constants"
import { PACKS } from "@covenant-desk/fixtures/data"
import { Effect } from "effect"
import { MAX_UPLOAD_BYTES, PDF_SIGNATURE } from "#constants"
import { AgentBusy, AgentUnavailable, InvalidUpload } from "#errors"
import { runtime } from "#runtime"

export interface UploadedPack {
  readonly filename: string
  readonly bytes: Uint8Array
}

const hasPdfSignature = (bytes: Uint8Array) =>
  new TextDecoder().decode(bytes.subarray(0, PDF_SIGNATURE.length)) === PDF_SIGNATURE

const loadPack = (borrowerId: string, upload: UploadedPack | null) =>
  Effect.gen(function* () {
    const spec = PACKS.find((pack) => pack.borrower.id === borrowerId)
    if (!spec) return yield* new NotFound({ entity: "borrower", id: borrowerId })
    if (upload === null) {
      const filename = `${spec.borrower.id}-${spec.period}.pdf`
      const bytes = new Uint8Array(yield* Effect.promise(() => readFile(PACKS_DIR + filename)))
      return { spec, filename, bytes }
    }
    if (upload.bytes.byteLength > MAX_UPLOAD_BYTES) {
      return yield* new InvalidUpload({ reason: "The file is larger than 10 MB" })
    }
    if (!hasPdfSignature(upload.bytes)) return yield* new InvalidUpload({ reason: "The file is not a PDF" })
    return { spec, filename: upload.filename, bytes: upload.bytes }
  })

/**
 * Opens a run for the borrower's pack and starts the agent in the background.
 * Returns as soon as the run exists, so the client can follow its progress.
 */
export const startAgentRun = (borrowerId: string, upload: UploadedPack | null) =>
  Effect.gen(function* () {
    if (!process.env.ANTHROPIC_API_KEY) {
      return yield* new AgentUnavailable({ reason: "ANTHROPIC_API_KEY is not set on the server" })
    }
    if (yield* hasActiveAgentRun) {
      return yield* new AgentBusy({ reason: "Another agent run is in progress. Try again when it finishes." })
    }

    const { spec, filename, bytes } = yield* loadPack(borrowerId, upload)
    const prepared = yield* prepareRun({ borrowerId: spec.borrower.id, period: spec.period, filename, bytes })
    runtime.runFork(driveAgent(prepared).pipe(Effect.ignore))
    return { runId: prepared.ctx.runId }
  })
