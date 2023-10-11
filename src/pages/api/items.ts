import { z } from "zod"

import { user } from "@/lib/db"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"

export const parser = z.object({
  items: z.array(z.number()),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
})

export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  const id = session.user.id

  const data = parseRequestBody(parser, req.body)
  await user.doc(id).set(data, { merge: true })

  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
