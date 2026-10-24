import type { BorrowerIdSchema, DocumentIdSchema, RunIdSchema } from "#schemas/ids"

export type BorrowerId = typeof BorrowerIdSchema.Type
export type RunId = typeof RunIdSchema.Type
export type DocumentId = typeof DocumentIdSchema.Type
