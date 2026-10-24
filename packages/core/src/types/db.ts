/** Values accepted as bound SQL parameters. */
export type SqlParam = string | number | boolean | null

/** JSON-serialisable value, as stored in `jsonb` columns. */
export type JsonValue =
  string | number | boolean | null | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue }
