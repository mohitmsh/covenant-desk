import { CertificateClaimSchema, FigureClaimSchema } from "@covenant-desk/core"
import { Schema } from "effect"
import { MAX_NOTE_LENGTH } from "#constants"

export const SubmitFiguresInputSchema = Schema.Struct({
  figures: Schema.Array(FigureClaimSchema).pipe(Schema.check(Schema.isMinLength(1)))
})

export const SubmitNoteInputSchema = Schema.Struct({
  body: Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(MAX_NOTE_LENGTH)))
})

export const SubmitCertificateInputSchema = Schema.Struct({
  claims: Schema.Array(CertificateClaimSchema).pipe(Schema.check(Schema.isMinLength(1)))
})
