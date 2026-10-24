import { Effect } from "effect"
import { Db } from "#db/client"

/** Runs `effect` inside a database transaction. */
export const withTransaction = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const db = yield* Db
    return yield* db.transaction(effect)
  })
