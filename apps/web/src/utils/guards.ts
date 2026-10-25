import {
  COVENANT_STATUSES,
  FIGURE_KEYS,
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
  METRICS,
  OPERATORS
} from "@covenant-desk/core/constants"
import type { CovenantStatus, FigureKey, IssueCategory, IssueStatus, JsonValue, Metric, Operator } from "@/types"

/** Narrows an untyped value, such as audit detail or a report field, to one of a set of literals. */
const oneOf =
  <T extends string>(values: ReadonlyArray<T>) =>
  (value: JsonValue | undefined): value is T =>
    values.some((candidate) => candidate === value)

export const isFigureKey = oneOf<FigureKey>(FIGURE_KEYS)
export const isMetric = oneOf<Metric>(METRICS)
export const isOperator = oneOf<Operator>(OPERATORS)
export const isCovenantStatus = oneOf<CovenantStatus>(COVENANT_STATUSES)
export const isIssueStatus = oneOf<IssueStatus>(ISSUE_STATUSES)
export const isIssueCategory = oneOf<IssueCategory>(ISSUE_CATEGORIES)
