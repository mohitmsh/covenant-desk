import { Schema } from "effect"
import { METRICS } from "#constants/covenants"
import { SCALES } from "#constants/figures"

/** A covenant result as the borrower reports it on the compliance certificate. */
export const CertificateClaimSchema = Schema.Struct({
  metric: Schema.Literals(METRICS),
  /** Number as printed, e.g. `3.62` for "3.62x" or `1540` for "1,540" in $'000. */
  reported: Schema.Finite,
  scale: Schema.Literals(SCALES),
  /** Whether the certificate states the covenant is complied with. */
  claimsCompliance: Schema.Boolean,
  page: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  quote: Schema.String.pipe(Schema.check(Schema.isMinLength(1)))
})
