import { z } from "zod"

import { user as firebaseUser } from "@/lib/db"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { UserData } from "@/types/db"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

export const parser = z.object({
  items: z.array(z.number()),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
})

export type DataType = z.infer<typeof parser>

export const createHandler = (user: UserData) =>
  (async (req, res, session) => {
    const id = session.user.id

    const data = parseRequestBody(parser, req.body)
    await user.set(id, data)

    res.status(200).json({ ok: true })
  }) satisfies AuthorisedHandler

export default createAuthorisedHandler(authOptions, createHandler(firebaseUser), ["POST"])
