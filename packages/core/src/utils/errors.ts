/** Normalises a thrown value to an `Error`. */
export const toError = <T>(thrown: T): Error => (thrown instanceof Error ? thrown : new Error(String(thrown)))
