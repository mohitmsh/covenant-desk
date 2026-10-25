import { CERTIFICATE_CHECKS } from "#constants/issues"
import { certificateEbitdaGap, compareCertificates } from "#services/certificate"
import type { EbitdaGap } from "#types/certificate"
import type { CheckInput, IssueFinding } from "#types/issues"
import { formatMetricValue } from "#utils/format"
import {
  complianceWord,
  describeCovenant,
  describeHeadroom,
  formatThousandsAmount,
  spokenValue
} from "#utils/issue-text"
import { unionBox } from "#utils/layout"

/**
 * One issue for certificate figures that all differ because the certificate
 * used a different EBITDA, listing what that does to each covenant.
 */
const ebitdaGapFinding = (input: CheckInput, gap: EbitdaGap): IssueFinding | null => {
  const comparisons = compareCertificates(input.covenants, input.claims).filter((c) => gap.metrics.includes(c.metric))
  const affected = comparisons.flatMap((comparison) => {
    const claim = input.claims.find((c) => c.metric === comparison.metric)
    const covenant = input.covenants.find((c) => c.metric === comparison.metric)
    return claim && covenant ? [{ comparison, claim, covenant }] : []
  })
  // The covenant whose outcome changes comes first.
  affected.sort(
    (a, b) =>
      Number(b.comparison.disagreements.includes("compliance")) -
      Number(a.comparison.disagreements.includes("compliance"))
  )
  const [first] = affected
  if (!first) return null
  const outcomeDiffers = affected.some((a) => a.comparison.disagreements.includes("compliance"))
  const effects = affected.map(({ comparison, covenant }) =>
    comparison.disagreements.includes("compliance")
      ? `${covenant.name} is a breach (${describeHeadroom(covenant)}) that the certificate reports as compliant`
      : `${covenant.name} still ${covenant.status === "pass" ? "passes" : `is on ${covenant.status}`} at ` +
        `${spokenValue(covenant.metric, covenant.actual)}, against ${spokenValue(covenant.metric, comparison.certificateValue)} on the certificate`
  )
  const boxes = affected.flatMap(({ claim }) => (claim.box ? [claim.box] : []))
  return {
    key: "certificate:ebitda",
    fingerprint: `certificate:ebitda:${affected.map((a) => a.comparison.disagreements.join("+")).join("/")}`,
    kind: "certificate_mismatch",
    category: "discrepancy",
    severity: outcomeDiffers ? "high" : "medium",
    title:
      gap.difference > 0
        ? `Certificate adds back ${formatThousandsAmount(Math.abs(gap.difference) / 1000)} not shown in the P&L`
        : `Certificate deducts ${formatThousandsAmount(Math.abs(gap.difference) / 1000)} not shown in the P&L`,
    detail:
      `The certificate's ratios use EBITDA of ${formatThousandsAmount(gap.certificate / 1000)} against ` +
      `${formatThousandsAmount(gap.reported / 1000)} in the P&L. ${effects.join(". ")}.`,
    page: first.claim.page,
    box: unionBox(boxes),
    evidence: affected.flatMap(({ comparison, claim, covenant }) => [
      {
        label: `${covenant.name}, certificate`,
        value: `${spokenValue(comparison.metric, comparison.certificateValue)} · ${complianceWord(comparison.claimsCompliance)}`,
        page: claim.page,
        box: claim.box
      },
      {
        label: `${covenant.name}, tested`,
        value: `${spokenValue(comparison.metric, comparison.testedValue)} · ${comparison.testedStatus}`,
        page: null,
        box: null
      }
    ]),
    impact: outcomeDiffers
      ? `${effects.join("; ")}. An undisclosed breach may itself be a default under the facility.`
      : `${effects.join("; ")}. Compliance does not change.`,
    checks: [...CERTIFICATE_CHECKS]
  }
}

/** Certificate claims that disagree with the tested results, merged when one EBITDA explains them. */
export const certificateFindings = (input: CheckInput): IssueFinding[] => {
  const { covenants, claims } = input
  const gap = certificateEbitdaGap(covenants, claims)
  const merged = gap && gap.metrics.length > 1 ? ebitdaGapFinding(input, gap) : null
  const explained = merged && gap ? gap.metrics : []
  return [
    ...(merged ? [merged] : []),
    ...singleCertificateFindings(input).filter((finding) => !explained.some((m) => finding.key === `certificate:${m}`))
  ]
}

const singleCertificateFindings = ({ covenants, claims }: CheckInput): IssueFinding[] =>
  compareCertificates(covenants, claims).flatMap((comparison) => {
    if (comparison.disagreements.length === 0) return []
    const claim = claims.find((c) => c.metric === comparison.metric)
    const covenant = covenants.find((c) => c.metric === comparison.metric)
    if (!claim || !covenant) return []
    const name = covenant.name.toLowerCase()
    const compliance = comparison.disagreements.includes("compliance")
    const certificateValue = formatMetricValue(comparison.metric, comparison.certificateValue)
    const testedValue = formatMetricValue(comparison.metric, comparison.testedValue)
    return [
      {
        key: `certificate:${comparison.metric}`,
        fingerprint: `certificate:${comparison.metric}:${comparison.disagreements.join("+")}`,
        kind: "certificate_mismatch",
        category: "discrepancy",
        severity: compliance ? "high" : "medium",
        title: compliance
          ? `Certificate says ${name} complies; tested result is a breach`
          : `Certificate reports a different ${name}`,
        detail:
          `The certificate states ${certificateValue} (${complianceWord(comparison.claimsCompliance)}). ` +
          `Tested from the verified figures: ${testedValue} (${comparison.testedStatus}).`,
        page: claim.page,
        box: claim.box,
        evidence: [
          {
            label: "Borrower's certificate",
            value: `${certificateValue} · ${complianceWord(comparison.claimsCompliance)}`,
            page: claim.page,
            box: claim.box
          },
          {
            label: "Tested from verified figures",
            value: `${testedValue} · ${comparison.testedStatus}`,
            page: null,
            box: null
          }
        ],
        impact: compliance
          ? `The certificate does not disclose a covenant breach, which may itself be a default under the facility. ${describeCovenant(covenant)}.`
          : "Both reach the same outcome, so compliance does not change. A different figure usually means the certificate used a different EBITDA or definition.",
        checks: [...CERTIFICATE_CHECKS]
      }
    ]
  })
