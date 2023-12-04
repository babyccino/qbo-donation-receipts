import { accounts, sessions } from "db/schema"
import { eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { db } from "@/lib/db/test"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"

export const parser = z.object({
  accountId: z.string(),
})

export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  const id = session.user.id
  const { accountId } = parseRequestBody(parser, req.body)
  const account = await db.query.accounts.findFirst({
    columns: { id: true },
    where: eq(accounts.id, accountId),
  })
  if (!account) throw new ApiError(400, "account with selected company id does not exist")
  await db.update(sessions).set({ accountId }).where(eq(sessions.userId, session.user.id))
  return res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
