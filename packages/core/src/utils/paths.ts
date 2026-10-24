import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../../", import.meta.url))

/** Resolves a path relative to the repository root. */
export const fromRepositoryRoot = (path: string): string => resolve(REPOSITORY_ROOT, path)
