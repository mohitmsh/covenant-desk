import { Effect } from "effect"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"
import { NotFound } from "#errors/runs"
import type { CovenantDefinition } from "#types/covenants"
import type { BorrowerId } from "#types/ids"
import type { Borrower } from "#types/runs"

const BORROWER_COLUMNS = `id, name, facility_name as "facilityName", facility_limit::float8 as "facilityLimit", analyst`

/** Creates or updates a borrower, and adds any covenant versions not yet stored. */
export const upsertBorrower = (
  borrower: Borrower,
  covenants: ReadonlyArray<CovenantDefinition>,
  effectiveFrom: string
) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* db.query(
        `insert into borrowers (id, name, facility_name, facility_limit, analyst) values ($1, $2, $3, $4, $5)
       on conflict (id) do update set name = excluded.name, facility_name = excluded.facility_name,
         facility_limit = excluded.facility_limit, analyst = excluded.analyst`,
        [borrower.id, borrower.name, borrower.facilityName, borrower.facilityLimit, borrower.analyst]
      )
      for (const c of covenants) {
        yield* db.query(
          `insert into covenant_definitions (id, version, borrower_id, name, metric, operator, limit_value, watch_headroom, effective_from)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict do nothing`,
          [c.id, c.version, borrower.id, c.name, c.metric, c.operator, c.limit, c.watchHeadroom, effectiveFrom]
        )
      }
    })
  )

export const listBorrowers = Effect.gen(function* () {
  const db = yield* Db
  return yield* db.query<Borrower>(`select ${BORROWER_COLUMNS} from borrowers order by name`)
})

export const getBorrower = (borrowerId: BorrowerId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [borrower] = yield* db.query<Borrower>(`select ${BORROWER_COLUMNS} from borrowers where id = $1`, [
      borrowerId
    ])
    if (borrower === undefined) return yield* new NotFound({ entity: "borrower", id: borrowerId })
    return borrower
  })

/** Returns a borrower and the latest version of each of its covenants. */
export const getMonitoringContext = (borrowerId: BorrowerId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const borrower = yield* getBorrower(borrowerId)
    const covenants = yield* db.query<CovenantDefinition>(
      `select distinct on (id) id, version, name, metric, operator,
         limit_value::float8 as "limit", watch_headroom::float8 as "watchHeadroom"
       from covenant_definitions where borrower_id = $1 order by id, version desc`,
      [borrowerId]
    )
    return { borrower, covenants }
  })
