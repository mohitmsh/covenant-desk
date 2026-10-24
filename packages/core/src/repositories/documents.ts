import { Effect } from "effect"
import { Db } from "#db/client"
import { firstRow } from "#db/rows"
import { isoTimestamp } from "#db/sql"
import { NotFound } from "#errors/runs"
import type { DocumentId } from "#types/ids"
import type { DocumentRecord, NewDocument } from "#types/runs"

/** Registers a source document. Re-registering the same file returns the existing id. */
export const registerDocument = (doc: NewDocument) =>
  Effect.gen(function* () {
    const db = yield* Db
    const rows = yield* db.query<{ id: DocumentId }>(
      `insert into documents (borrower_id, period, filename, sha256, storage_key, page_count) values ($1, $2, $3, $4, $5, $6)
       on conflict (borrower_id, sha256) do update set filename = excluded.filename
       returning id`,
      [doc.borrowerId, doc.period, doc.filename, doc.sha256, doc.storageKey, doc.pageCount]
    )
    return (yield* firstRow(rows, "registerDocument")).id
  })

export const getDocument = (documentId: DocumentId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [document] = yield* db.query<DocumentRecord>(
      `select id, filename, sha256, storage_key as "storageKey", page_count as "pageCount",
         ${isoTimestamp("received_at")} as "receivedAt"
       from documents where id = $1`,
      [documentId]
    )
    if (document === undefined) return yield* new NotFound({ entity: "document", id: documentId })
    return document
  })
