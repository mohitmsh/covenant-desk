import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Context, Effect, Layer } from "effect"
import { DOCUMENTS_DIR } from "#constants/storage"
import { DocumentStoreError } from "#errors/storage"
import { toError } from "#utils/errors"
import { sha256 } from "#utils/hash"
import { fromRepositoryRoot } from "#utils/paths"

export interface DocumentStoreApi {
  /** Stores a file under its SHA-256 digest and returns the storage key. */
  readonly put: (bytes: Uint8Array) => Effect.Effect<string, DocumentStoreError>
  readonly get: (key: string) => Effect.Effect<Uint8Array<ArrayBuffer>, DocumentStoreError>
}

export class DocumentStore extends Context.Service<DocumentStore, DocumentStoreApi>()("DocumentStore") {}

const STORAGE_KEY_PATTERN = /^[0-9a-f]{64}\.pdf$/

/** Content-addressed document store on the local filesystem. */
export const fileDocumentStoreLayer = (directory = fromRepositoryRoot(DOCUMENTS_DIR)) =>
  Layer.succeed(DocumentStore, {
    put: (bytes) => {
      const key = `${sha256(bytes)}.pdf`
      return Effect.tryPromise({
        try: async () => {
          await mkdir(directory, { recursive: true })
          await writeFile(join(directory, key), bytes)
          return key
        },
        catch: (cause) => new DocumentStoreError({ key, cause: toError(cause) })
      })
    },
    get: (key) =>
      STORAGE_KEY_PATTERN.test(key)
        ? Effect.tryPromise({
            try: async () => new Uint8Array(await readFile(join(directory, key))),
            catch: (cause) => new DocumentStoreError({ key, cause: toError(cause) })
          })
        : Effect.fail(new DocumentStoreError({ key, cause: new Error("Invalid storage key") }))
  })
