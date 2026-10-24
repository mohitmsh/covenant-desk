import { API_ROUTES } from "@/constants"
import type { Borrower } from "@/types"
import { requestJson } from "./client"

export const fetchBorrowers = () => requestJson<ReadonlyArray<Borrower>>(API_ROUTES.borrowers)
