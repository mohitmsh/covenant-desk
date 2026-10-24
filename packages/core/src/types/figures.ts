import type { FIGURE_KEYS, SCALES } from "#constants/figures"
import type { FigureClaimSchema } from "#schemas/figures"

export type FigureKey = (typeof FIGURE_KEYS)[number]

export type Scale = (typeof SCALES)[number]

export type FigureClaim = typeof FigureClaimSchema.Type

/** A figure whose quote and number have been found on the cited page. */
export interface VerifiedFigure extends FigureClaim {
  /** `reported × scale`, in whole dollars. */
  readonly value: number
}

export type FigureSet = Partial<Record<FigureKey, VerifiedFigure>>
