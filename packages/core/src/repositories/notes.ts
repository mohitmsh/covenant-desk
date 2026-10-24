import { Effect } from "effect"
import { AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"
import { firstRow } from "#db/rows"
import { isoTimestamp } from "#db/sql"
import type { RunId } from "#types/ids"
import type { Note } from "#types/runs"
import { appendEvent } from "#repositories/audit-events"
import { requireRunStatus, setRunStatus } from "#repositories/runs"

/** Saves a new note version and moves the run to `awaiting_signoff`. Returns the version number. */
export const saveNote = (runId: RunId, body: string, author: string) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* requireRunStatus(runId, ["tested", "awaiting_signoff"], "save a note")
      const rows = yield* db.query<{ version: number }>(
        `insert into notes (run_id, version, body, author)
       values ($1, coalesce((select max(version) from notes where run_id = $1), 0) + 1, $2, $3)
       returning version`,
        [runId, body, author]
      )
      const { version } = yield* firstRow(rows, "saveNote")
      yield* setRunStatus(runId, "awaiting_signoff")
      yield* appendEvent(runId, author, AUDIT_EVENT_KINDS.NOTE_SAVED, { version })
      return version
    })
  )

export const getLatestNote = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [note] = yield* db.query<Note>(
      `select version, body, author, ${isoTimestamp("created_at")} as "createdAt"
       from notes where run_id = $1 order by version desc limit 1`,
      [runId]
    )
    return note ?? null
  })
