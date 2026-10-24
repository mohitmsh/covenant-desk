import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../../db/migrations", import.meta.url))

/** Applies pending SQL migrations in filename order, each in its own transaction. */
export const migrate = Effect.gen(function* () {
  const db = yield* Db
  yield* db.exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"
  )

  const applied = new Set(
    (yield* db.query<{ name: string }>("select name from schema_migrations")).map((row) => row.name)
  )
  const pending = (yield* Effect.promise(() => readdir(MIGRATIONS_DIR)))
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort()

  for (const file of pending) {
    const sql = yield* Effect.promise(() => readFile(`${MIGRATIONS_DIR}/${file}`, "utf8"))
    yield* withTransaction(
      Effect.gen(function* () {
        const db = yield* Db
        yield* db.exec(sql)
        yield* db.query("insert into schema_migrations (name) values ($1)", [file])
      })
    )
  }
})

/** Empties every application table, keeping the schema. Used to restore a hosted demo to its seeded state. */
export const truncateAll = Effect.gen(function* () {
  const db = yield* Db
  const tables = yield* db.query<{ name: string }>(
    `select tablename as name from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations'`
  )
  if (tables.length === 0) return
  yield* db.exec(`truncate table ${tables.map((t) => `"${t.name}"`).join(", ")} cascade`)
})
