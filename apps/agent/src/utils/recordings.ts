import { mkdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname } from "node:path"
import { RECORDINGS_DIR } from "@covenant-desk/fixtures/constants"
import type { PackSpec } from "@covenant-desk/fixtures/types"
import type { AgentRecording } from "#types"
import { packFilename } from "#utils/packs"

const recordingPath = (spec: PackSpec) => `${RECORDINGS_DIR}${packFilename(spec).replace(/\.pdf$/, ".json")}`

/** Where an eval case's own recording lives. */
export const evalRecordingPath = (caseId: string) => `${RECORDINGS_DIR}evals/${caseId}.json`

/** Recording for a demo pack, which an eval case on the same pack can reuse. */
export const packRecordingPath = (packFile: string) =>
  `${RECORDINGS_DIR}${basename(packFile).replace(/\.pdf$/, ".json")}`

export const saveRecordingAt = async (path: string, recording: AgentRecording): Promise<void> => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(recording, null, 2)}\n`)
}

/** The recording at a path, or null when there is none. */
export const loadRecordingAt = async (path: string): Promise<AgentRecording | null> => {
  const text = await readFile(path, "utf8").catch(() => null)
  if (text === null) return null
  const recording: AgentRecording = JSON.parse(text)
  return recording
}

export const saveRecording = (spec: PackSpec, recording: AgentRecording) =>
  saveRecordingAt(recordingPath(spec), recording)

/** The saved recording for a pack, or null when there is none. */
export const loadRecording = (spec: PackSpec) => loadRecordingAt(recordingPath(spec))
