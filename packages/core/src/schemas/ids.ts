import { Schema } from "effect"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const Uuid = Schema.String.pipe(Schema.check(Schema.isPattern(UUID_PATTERN)))

export const BorrowerIdSchema = Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.brand("BorrowerId"))

export const RunIdSchema = Uuid.pipe(Schema.brand("RunId"))

export const DocumentIdSchema = Uuid.pipe(Schema.brand("DocumentId"))
