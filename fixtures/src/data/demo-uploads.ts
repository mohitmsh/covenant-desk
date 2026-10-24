import type { PackSpec } from "#types"
import { PACKS } from "#data/borrowers"

const corella = PACKS.find((pack) => pack.borrower.id === "corella")
if (!corella) throw new Error("corella pack spec is missing")

/**
 * Packs that are not seeded and have no answer key, for demonstrating an
 * upload of a document the app has never seen.
 */
export const DEMO_UPLOADS: ReadonlyArray<{ readonly file: string; readonly spec: PackSpec }> = [
  {
    file: "corella-2026-09-resubmitted.pdf",
    spec: {
      ...corella,
      ttm: { revenue: 59_840, ebitda: 4_700, interest: 2_000 },
      cogsPct: 0.795,
      rcfDrawn: 5_200,
      cash: 1_250,
      certificateEbitda: {
        value: 5_300,
        addBacks: "flood-related spoilage write-offs ($420k) and one-off restructuring of the Gatton packhouse ($180k)"
      },
      commentary: [
        "This pack replaces the one sent on 9 October. Our auditors identified $510k of September inventory spoilage that had not been written off, and the revised trial balance is reflected throughout.",
        "On the revised numbers, twelve-month EBITDA is $4.7m. Excluding the flood-related spoilage and the one-off Gatton packhouse restructuring, which we regard as non-recurring, adjusted EBITDA is $5.3m.",
        "We drew a further $300k on the revolver in late September to cover supplier payments. Management is confident of returning to the budgeted margin from December."
      ],
      expectedStatus: {
        "corella-net-leverage": "breach",
        "corella-interest-cover": "watch",
        "corella-liquidity": "watch"
      }
    }
  }
]
