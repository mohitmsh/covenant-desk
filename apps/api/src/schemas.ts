import { ISSUE_ACTIONS } from "@covenant-desk/core/constants"
import { Schema } from "effect"

const NonBlankString = Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(10_000)))

export const ApproveRunBodySchema = Schema.Struct({
  approver: NonBlankString.pipe(Schema.check(Schema.isMaxLength(120)))
})

export const SaveNoteBodySchema = Schema.Struct({
  body: NonBlankString,
  author: NonBlankString.pipe(Schema.check(Schema.isMaxLength(120)))
})

export const DecideIssueBodySchema = Schema.Struct({
  action: Schema.Literals(ISSUE_ACTIONS),
  actor: NonBlankString.pipe(Schema.check(Schema.isMaxLength(120))),
  reason: Schema.optional(Schema.String.pipe(Schema.check(Schema.isMaxLength(2_000)))),
  draft: Schema.optional(Schema.String.pipe(Schema.check(Schema.isMaxLength(10_000)))),
  remember: Schema.optional(Schema.Boolean)
})
