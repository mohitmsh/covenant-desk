/** SQL expression rendering a `timestamptz` column as an ISO 8601 UTC string. */
export const isoTimestamp = (column: string): string =>
  `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
