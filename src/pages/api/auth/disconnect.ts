import { and, eq } from "drizzle-orm"
import { NextApiHandler, NextApiRequest } from "next"
import { Session, getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { serverSignIn } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { config } from "@/lib/util/config"
import { parseRequestBody } from "@/lib/util/request-server"
import { authOptions } from "@/auth"
import { accounts } from "db/schema"
import { revokeAccessToken } from "@/lib/auth/next-auth-helper-server"

const {
  qboClientId,
  qboClientSecret,
  qboOauthRevocationEndpoint,
  nextauthSecret: secret,
  vercelEnv,
} = config

async function getAccount(query: NextApiRequest["query"], session: Session | null) {
  const queryRealmId = query["realmId"]
  if (typeof queryRealmId === "string") return { realmId: queryRealmId, accessToken: undefined }

  if (!session || !session.accountId)
    throw new ApiError(500, "realmId not provided in query params or session")

  const account = await db.query.accounts.findFirst({
    columns: { realmId: true, accessToken: true },
    where: and(eq(accounts.id, session.accountId), eq(accounts.userId, session.user.id)),
  })
  if (!account?.realmId || !account?.accessToken)
    throw new ApiError(500, "session's account does not have a company to disconnect")

  return account as { realmId: string; accessToken: string }
}

export const parser = z.object({
  redirect: z.boolean().default(true),
  reconnect: z.boolean().default(false),
})
export type DisconnectBody = z.input<typeof parser>

const handler: NextApiHandler = async (req, res) => {
  if (!(req.method === "GET" || req.method === "POST")) return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  const { realmId, accessToken } = await getAccount(req.query, session)

  const shouldRevokeAccessToken = req.query["revoke"] === "true"
  await Promise.all([
    db
      .update(accounts)
      .set({
        accessToken: null,
        expiresAt: null,
        refreshToken: null,
        refreshTokenExpiresAt: null,
        scope: "profile",
      })
      .where(
        and(
          eq(accounts.realmId, realmId),
          session ? eq(accounts.userId, session.user.id) : undefined,
        ),
      ),
    // the caller can specify whether or not they want their access token to be disconnected
    // this is because if the user has been disconnected from within QBO then they will have
    // already revoked their tokens
    // if the user is disconnecting from within the application the tokens will need to be
    // revoked by us
    session && shouldRevokeAccessToken && accessToken && revokeAccessToken(accessToken),
  ])

  const { redirect, reconnect } = req.body
    ? parseRequestBody(parser, req.body)
    : { redirect: true, reconnect: false }

  // if reconnect is specified user will be re-signed in, without the accounting permissions
  // i.e. signed in, in the `disconnected` state
  // if the user is not signed in they will also need to be signed in, in this state
  if (reconnect || !session) {
    console.log("...reconnecting")
    const redirectUrl = await serverSignIn(
      "QBO-disconnected",
      req,
      res,
      redirect,
      "/auth/disconnected",
    )

    if (redirect) return
    else res.status(200).json({ redirect: redirectUrl })
  } else {
    if (redirect) res.redirect(302, "/auth/disconnected")
    else res.status(200).json({ redirect: "/auth/disconnected" })
  }
}
export default handler
