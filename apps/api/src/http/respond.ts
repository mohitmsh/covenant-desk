import type { Context } from "hono"
import { Result, type Effect } from "effect"
import { runApp, type AppServices } from "#runtime"
import { toHttpError } from "#http/errors"

/** Runs an application effect and writes its result, or a mapped error, as JSON. */
export const respondJson = async <A, E extends { readonly _tag: string }>(
  c: Context,
  effect: Effect.Effect<A, E, AppServices>
) => {
  const result = await runApp(effect)
  if (Result.isSuccess(result)) return c.json(result.success)
  const { status, body } = toHttpError(result.failure)
  return c.json(body, status)
}
