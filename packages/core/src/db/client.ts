import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { Context, Effect, Exit, Layer } from "effect"
import pg from "pg"
import { DB_POOL_MAX_CONNECTIONS, DB_STATEMENT_TIMEOUT_MS, PGLITE_DATA_DIR } from "#constants/db"
import { DbError } from "#errors/db"
import type { SqlParam } from "#types/db"
import { toError } from "#utils/errors"
import { fromRepositoryRoot } from "#utils/paths"

interface Connection {
  readonly query: <T>(sql: string, params: ReadonlyArray<SqlParam>) => Promise<ReadonlyArray<T>>
  readonly exec: (sql: string) => Promise<void>
}

interface ReservedConnection extends Connection {
  readonly release: () => void
}

interface Driver {
  readonly pool: Connection
  /** Checks out a connection for the duration of one transaction. */
  readonly reserve: () => Promise<ReservedConnection>
  readonly close: () => Promise<void>
}

export interface DbApi {
  readonly query: <T>(sql: string, params?: ReadonlyArray<SqlParam>) => Effect.Effect<ReadonlyArray<T>, DbError>
  readonly exec: (sql: string) => Effect.Effect<void, DbError>
  /**
   * Runs `effect` in a transaction on a single connection. Commits on success;
   * rolls back on failure or interruption. Nested calls join the outer transaction.
   */
  readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E | DbError, Exclude<R, Db>>
}

export class Db extends Context.Service<Db, DbApi>()("Db") {}

const bind = (conn: Connection): Omit<DbApi, "transaction"> => ({
  query: <T>(sql: string, params: ReadonlyArray<SqlParam> = []) =>
    Effect.tryPromise({
      try: () => conn.query<T>(sql, params),
      catch: (cause) => new DbError({ sql, cause: toError(cause) })
    }),
  exec: (sql: string) =>
    Effect.tryPromise({
      try: () => conn.exec(sql),
      catch: (cause) => new DbError({ sql, cause: toError(cause) })
    })
})

const makeApi = (driver: Driver): DbApi => {
  const transaction = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E | DbError, Exclude<R, Db>> =>
    Effect.acquireUseRelease(
      Effect.tryPromise({
        try: driver.reserve,
        catch: (cause) => new DbError({ sql: "begin", cause: toError(cause) })
      }),
      (conn) => {
        const tx = bind(conn)
        const txApi: DbApi = { ...tx, transaction: (inner) => Effect.provideService(inner, Db, txApi) }
        return tx.exec("begin").pipe(Effect.andThen(Effect.provideService(effect, Db, txApi)))
      },
      (conn, exit) =>
        bind(conn)
          .exec(Exit.isSuccess(exit) ? "commit" : "rollback")
          .pipe(Effect.ignore, Effect.ensuring(Effect.sync(conn.release)))
    )

  return { ...bind(driver.pool), transaction }
}

const layerFromDriver = (open: () => Promise<Driver>) =>
  Layer.effect(
    Db,
    Effect.map(
      Effect.acquireRelease(Effect.promise(open), (driver) => Effect.promise(driver.close)),
      makeApi
    )
  )

/**
 * Embedded Postgres via PGlite. In-memory when `dataDir` is omitted.
 * PGlite has one connection, so transactions are serialised.
 */
export const pgliteLayer = (dataDir?: string) =>
  layerFromDriver(async () => {
    if (dataDir) await mkdir(dirname(dataDir), { recursive: true })
    const db = await PGlite.create(dataDir)
    const conn: Connection = {
      query: async <T>(sql: string, params: ReadonlyArray<SqlParam>) => (await db.query<T>(sql, [...params])).rows,
      exec: async (sql) => void (await db.exec(sql))
    }
    let queue = Promise.resolve()
    return {
      pool: conn,
      reserve: async () => {
        let release = () => {}
        const previous = queue
        queue = new Promise<void>((resolveQueue) => (release = resolveQueue))
        await previous
        return { ...conn, release }
      },
      close: () => db.close()
    }
  })

/** PostgreSQL via a `pg` connection pool. */
export const postgresLayer = (connectionString: string) =>
  layerFromDriver(async () => {
    const pool = new pg.Pool({
      connectionString,
      max: DB_POOL_MAX_CONNECTIONS,
      statement_timeout: DB_STATEMENT_TIMEOUT_MS
    })
    const connection = (client: pg.Pool | pg.PoolClient): Connection => ({
      // `pg` returns untyped rows; callers declare the row shape they select.
      query: async <T>(sql: string, params: ReadonlyArray<SqlParam>) =>
        (await client.query(sql, [...params])).rows as T[],
      exec: async (sql) => void (await client.query(sql))
    })
    return {
      pool: connection(pool),
      reserve: async () => {
        const client = await pool.connect()
        return { ...connection(client), release: () => client.release() }
      },
      close: () => pool.end()
    }
  })

/** Postgres at `DATABASE_URL` when set, otherwise PGlite persisted in the repository's `.data/`. */
export const dbLayerFromEnv = () => {
  const url = process.env.DATABASE_URL
  return url ? postgresLayer(url) : pgliteLayer(fromRepositoryRoot(PGLITE_DATA_DIR))
}
