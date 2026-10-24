import { dbLayerFromEnv, migrate, upsertBorrower } from "@covenant-desk/core"
import { Effect } from "effect"
import { COVENANTS_EFFECTIVE_FROM } from "#constants"
import { PACKS } from "#data/borrowers"

const program = Effect.gen(function* () {
  yield* migrate
  for (const { borrower, covenants } of PACKS) {
    yield* upsertBorrower(borrower, covenants, COVENANTS_EFFECTIVE_FROM)
    console.log(`Seeded ${borrower.name} (${covenants.length} covenants)`)
  }
})

Effect.runPromise(program.pipe(Effect.provide(dbLayerFromEnv())))
