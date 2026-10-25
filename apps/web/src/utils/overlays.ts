import { FIGURE_LABELS } from "@covenant-desk/core/constants"
import { METRIC_LABELS } from "@/constants"
import type { Issue, OnPage, PageField, PageMarker, VerifiedCertificateClaim, VerifiedFigure } from "@/types"
import { formatAsReported } from "./figures"
import { formatMetric } from "./format"
import { issueTone } from "./issues"

/** Key that identifies a certificate claim among the extracted fields. */
export const claimKey = (claim: VerifiedCertificateClaim): string => `certificate:${claim.metric}`

/** A numbered box for each issue that can be placed on its page. */
export const issueMarkers = (issues: ReadonlyArray<Issue>, activeKey: string | null): OnPage<PageMarker>[] =>
  issues.flatMap((issue, index) =>
    issue.box
      ? [
          {
            key: issue.key,
            page: issue.page,
            number: index + 1,
            label: issue.title,
            box: issue.box,
            tone: issueTone(issue),
            active: issue.key === activeKey
          }
        ]
      : []
  )

/** An outline for every verified figure and certificate claim that can be placed on its page. */
export const extractedFields = (
  figures: ReadonlyArray<VerifiedFigure>,
  claims: ReadonlyArray<VerifiedCertificateClaim>,
  focusedKey: string | null
): OnPage<PageField>[] => [
  ...figures.flatMap((figure) =>
    figure.box
      ? [
          {
            key: figure.key,
            page: figure.page,
            label: FIGURE_LABELS[figure.key],
            value: formatAsReported(figure),
            box: figure.box,
            active: focusedKey === figure.key
          }
        ]
      : []
  ),
  ...claims.flatMap((claim) =>
    claim.box
      ? [
          {
            key: claimKey(claim),
            page: claim.page,
            label: `Certificate · ${METRIC_LABELS[claim.metric]}`,
            value: formatMetric(claim.metric, claim.value),
            box: claim.box,
            active: focusedKey === claimKey(claim)
          }
        ]
      : []
  )
]
