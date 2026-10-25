import { useQuery } from "@tanstack/react-query"
import { fetchEvals } from "@/api/evals"
import { QUERY_KEYS } from "@/constants"

/** The latest eval report. */
export const useEvals = () => useQuery({ queryKey: QUERY_KEYS.evals, queryFn: fetchEvals })
