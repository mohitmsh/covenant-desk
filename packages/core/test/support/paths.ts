import { fileURLToPath } from "node:url"

export const WATTLE_GROVE_PACK = fileURLToPath(
  new URL("../../../../fixtures/packs/wattle-grove-2026-09.pdf", import.meta.url)
)

export const HARBOURLINE_PACK = fileURLToPath(
  new URL("../../../../fixtures/packs/harbourline-2026-09.pdf", import.meta.url)
)
