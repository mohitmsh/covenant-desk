import { createHash } from "node:crypto"

/** Hex-encoded SHA-256 digest. */
export const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex")
