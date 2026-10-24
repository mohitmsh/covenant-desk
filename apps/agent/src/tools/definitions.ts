import type Anthropic from "@anthropic-ai/sdk"
import { FIGURE_KEYS, METRICS, SCALES } from "@covenant-desk/core/constants"
import { TOOL_NAMES } from "#constants"

const EMPTY_INPUT: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false
}

export const TOOLS: Anthropic.Tool[] = [
  {
    name: TOOL_NAMES.GET_CONTEXT,
    description:
      "Returns the borrower, facility, reporting period, covenant definitions with limits, and the figures that must be extracted.",
    strict: true,
    input_schema: EMPTY_INPUT
  },
  {
    name: TOOL_NAMES.SUBMIT_FIGURES,
    description:
      "Submits extracted figures. Each figure is verified against the cited page: the quote must appear on that page and contain the reported number. Returns which figures were accepted and why any were rejected.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        figures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: [...FIGURE_KEYS] },
              reported: { type: "number", description: "Number as printed, without separators or brackets." },
              scale: { type: "integer", enum: [...SCALES], description: "1000 for $'000 tables." },
              page: { type: "integer", description: "1-indexed PDF page." },
              quote: { type: "string", description: "Row label and numbers, copied exactly from the page." }
            },
            required: ["key", "reported", "scale", "page", "quote"],
            additionalProperties: false
          }
        }
      },
      required: ["figures"],
      additionalProperties: false
    }
  },
  {
    name: TOOL_NAMES.SUBMIT_CERTIFICATE,
    description:
      "Submits the covenant results the borrower reports on its compliance certificate. Each claim is verified against the cited page the same way as figures.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string", enum: [...METRICS] },
              reported: {
                type: "number",
                description: "Number as printed, e.g. 3.62 for 3.62x, or 1540 in a $'000 table."
              },
              scale: { type: "integer", enum: [...SCALES], description: "1 for ratios, 1000 for $'000 amounts." },
              claimsCompliance: { type: "boolean", description: "Whether the certificate states the covenant is met." },
              page: { type: "integer", description: "1-indexed PDF page." },
              quote: { type: "string", description: "Row label and reported number, copied exactly from the page." }
            },
            required: ["metric", "reported", "scale", "claimsCompliance", "page", "quote"],
            additionalProperties: false
          }
        }
      },
      required: ["claims"],
      additionalProperties: false
    }
  },
  {
    name: TOOL_NAMES.TEST_COVENANTS,
    description:
      "Tests every covenant against the accepted figures and returns each tested value, limit, headroom and status, compared with the borrower's certificate.",
    strict: true,
    input_schema: EMPTY_INPUT
  },
  {
    name: TOOL_NAMES.SUBMIT_NOTE,
    description: "Saves the monitoring note for analyst review. Call once, after test_covenants.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { body: { type: "string", description: "The monitoring note, plain text." } },
      required: ["body"],
      additionalProperties: false
    }
  }
]
