import { listBorrowers } from "@covenant-desk/core"
import { Hono } from "hono"
import { respondJson } from "#http/respond"

export const borrowersRoutes = new Hono().get("/", (c) => respondJson(c, listBorrowers))
