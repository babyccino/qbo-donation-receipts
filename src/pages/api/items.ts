import { createId } from "@paralleldrive/cuid2"
import { and, eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { db } from "@/lib/db"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { accounts, userDatas } from "db/schema"

export const parser = z.object({
  items: z.array(z.string()),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
})

export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  if (!session.accountId) throw new ApiError(401, "user not connected")

  const data = parseRequestBody(parser, req.body)
  const {
    items: itemsStr,
    dateRange: { startDate, endDate },
  } = data

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, session.accountId),
    columns: {
      id: true,
      scope: true,
    },
  })
  if (!account) throw new ApiError(401, "account not found for given userid and company realmid")

  const items = itemsStr.join(",")
  await db
    .insert(userDatas)
    .values({
      id: createId(),
      accountId: account.id,
      endDate,
      startDate,
      items,
    })
    .onConflictDoUpdate({
      target: [userDatas.accountId],
      set: { startDate, endDate, items, updatedAt: new Date() },
    })

  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
