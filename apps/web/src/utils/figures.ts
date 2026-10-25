import { FIGURE_KEYS } from "@covenant-desk/core/constants"
import type { VerifiedFigure } from "@/types"

/** Orders figures as they appear in a reporting pack. */
export const sortFigures = (figures: ReadonlyArray<VerifiedFigure>): VerifiedFigure[] =>
  [...figures].sort((a, b) => FIGURE_KEYS.indexOf(a.key) - FIGURE_KEYS.indexOf(b.key))

const SCALE_SUFFIX: Readonly<Record<number, string>> = { 1: "", 1_000: " ($'000)", 1_000_000: " ($m)" }

/** The figure as printed in the source, e.g. `3,880 ($'000)`. */
export const formatAsReported = (figure: VerifiedFigure): string =>
  `${figure.reported.toLocaleString("en-AU")}${SCALE_SUFFIX[figure.scale] ?? ""}`
