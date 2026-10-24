import { readFile } from "node:fs/promises"
import { PACKS_DIR } from "@covenant-desk/fixtures/constants"
import { PACKS } from "@covenant-desk/fixtures/data"
import type { PackSpec } from "@covenant-desk/fixtures/types"

export const packFilename = (spec: PackSpec): string => `${spec.borrower.id}-${spec.period}.pdf`

export const readPack = async (spec: PackSpec): Promise<Uint8Array> =>
  new Uint8Array(await readFile(PACKS_DIR + packFilename(spec)))

export const findPack = (borrowerId: string): PackSpec | undefined => PACKS.find((p) => p.borrower.id === borrowerId)

export { PACKS }
