import { dbLayerFromEnv, fileDocumentStoreLayer, migrate } from "@covenant-desk/core"
import { Effect, Layer, ManagedRuntime } from "effect"

/** Application services, with migrations applied before the first request. */
const AppLayer = Layer.effectDiscard(migrate).pipe(
  Layer.provideMerge(Layer.mergeAll(dbLayerFromEnv(), fileDocumentStoreLayer()))
)

export const runtime = ManagedRuntime.make(AppLayer)

export type AppServices = ManagedRuntime.ManagedRuntime.Services<typeof runtime>

export const runApp = <A, E>(effect: Effect.Effect<A, E, AppServices>) => runtime.runPromise(Effect.result(effect))
