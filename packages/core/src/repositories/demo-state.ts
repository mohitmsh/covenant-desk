import { Effect } from "effect"
import { DEMO_SEED_LOCK_ID, DEMO_VERSION_KEY } from "#constants/db"
import { Db } from "#db/client"

/**
 * Holds a lock for the rest of the current transaction, so two instances
 * starting together seed the demo one after the other rather than at once.
 */
export const lockDemoSeed = Effect.gen(function* () {
  const db = yield* Db
  yield* db.query("select pg_advisory_xact_lock($1)", [DEMO_SEED_LOCK_ID])
})

/** The fingerprint of the demo data last seeded, or null before the first seed. */
export const getDemoVersion = Effect.gen(function* () {
  const db = yield* Db
  const [row] = yield* db.query<{ value: string }>("select value from demo_state where key = $1", [DEMO_VERSION_KEY])
  return row?.value ?? null
})

export const setDemoVersion = (version: string) =>
  Effect.gen(function* () {
    const db = yield* Db
    yield* db.query(
      `insert into demo_state (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value`,
      [DEMO_VERSION_KEY, version]
    )
  })
