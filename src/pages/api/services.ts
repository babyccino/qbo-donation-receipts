import { z } from "zod"

import { user } from "@/lib/db"
import { AuthorisedHanlder, createAuthorisedHandler, parseRequestBody } from "@/lib/app-api"

export const parser = z.object({
  items: z.array(z.number()),
  date: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHanlder = async (req, res, session) => {
  const id = session.user.id

  const data = parseRequestBody(parser, req.body)

  await user.doc(id).update(data)

  res.status(200).json(data)
}

export default createAuthorisedHandler(handler, ["POST"])
