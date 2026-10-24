import { getPortfolio } from "@covenant-desk/core"
import { Hono } from "hono"
import { respondJson } from "#http/respond"

export const portfolioRoutes = new Hono().get("/", (c) => respondJson(c, getPortfolio))
