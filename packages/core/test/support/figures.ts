import { FIGURE_KEYS, type FigureKey, type FigureSet, type Scale, type VerifiedFigure } from "@covenant-desk/core"

const DEFAULT_SCALE: Scale = 1_000

/** Builds a verified figure from a whole-dollar value. */
export const verifiedFigure = (key: FigureKey, value: number, page = 3): VerifiedFigure => ({
  key,
  value,
  reported: value / DEFAULT_SCALE,
  scale: DEFAULT_SCALE,
  page,
  quote: `${key} ${value / DEFAULT_SCALE}`,
  box: null
})

/** Builds a figure set from whole-dollar values. */
export const figureSet = (values: Partial<Record<FigureKey, number>>): FigureSet => {
  const set: FigureSet = {}
  for (const key of FIGURE_KEYS) {
    const value = values[key]
    if (value !== undefined) set[key] = verifiedFigure(key, value)
  }
  return set
}
