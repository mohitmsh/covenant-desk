import { API_ROUTES } from "@/constants"
import type { Portfolio } from "@/types"
import { requestJson } from "./client"

export const fetchPortfolio = () => requestJson<Portfolio>(API_ROUTES.portfolio)
