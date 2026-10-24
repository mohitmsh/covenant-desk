import { Schema } from "effect"

const NonBlankString = Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(10_000)))

export const ApproveRunBodySchema = Schema.Struct({
  approver: NonBlankString.pipe(Schema.check(Schema.isMaxLength(120)))
})

export const SaveNoteBodySchema = Schema.Struct({
  body: NonBlankString,
  author: NonBlankString.pipe(Schema.check(Schema.isMaxLength(120)))
})
