import { z } from "zod"
import { createId } from "@paralleldrive/cuid2"

import { db } from "@/lib/db/test"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { userDatas } from "db/schema"

export const parser = z.object({
  items: z.array(z.number()),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
  realmId: z.number().int(),
})

export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  const id = session.user.id

  const data = parseRequestBody(parser, req.body)
  const {
    items: itemsStr,
    dateRange: { startDate, endDate },
    realmId,
  } = data
  const items = itemsStr.join(",")
  await db
    .insert(userDatas)
    .values({
      id: createId(),
      userId: id,
      realmId,
      endDate,
      startDate,
      items,
    })
    .onConflictDoUpdate({
      target: [userDatas.userId, userDatas.realmId],
      set: { startDate, endDate, items },
    })
  // const set = await db
  //   .select()
  //   .from(userDatas)
  //   .where(and(eq(userDatas.userId, id), eq(userDatas.realmId, realmId)))
  // console.log(set)

  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
