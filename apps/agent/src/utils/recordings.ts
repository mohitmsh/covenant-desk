import { mkdir, readFile, writeFile } from "node:fs/promises"
import { RECORDINGS_DIR } from "@covenant-desk/fixtures/constants"
import type { PackSpec } from "@covenant-desk/fixtures/types"
import type { AgentRecording } from "#types"
import { packFilename } from "#utils/packs"

const recordingPath = (spec: PackSpec) => `${RECORDINGS_DIR}${packFilename(spec).replace(/\.pdf$/, ".json")}`

export const saveRecording = async (spec: PackSpec, recording: AgentRecording): Promise<void> => {
  await mkdir(RECORDINGS_DIR, { recursive: true })
  await writeFile(recordingPath(spec), `${JSON.stringify(recording, null, 2)}\n`)
}

/** The saved recording for a pack, or null when there is none. */
export const loadRecording = async (spec: PackSpec): Promise<AgentRecording | null> => {
  const text = await readFile(recordingPath(spec), "utf8").catch(() => null)
  if (text === null) return null
  const recording: AgentRecording = JSON.parse(text)
  return recording
}
