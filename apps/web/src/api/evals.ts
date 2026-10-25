import { API_ROUTES } from "@/constants"
import type { EvalReport } from "@/types"
import { requestJson } from "./client"

export const fetchEvals = () => requestJson<EvalReport>(API_ROUTES.evals)
