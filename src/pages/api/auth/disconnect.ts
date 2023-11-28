import { and, eq } from "drizzle-orm"
import { NextApiHandler } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { serverSignIn } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db/test"
import { config } from "@/lib/util/config"
import { base64EncodeString } from "@/lib/util/image-helper"
import { getResponseContent } from "@/lib/util/request"
import { parseRequestBody } from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { accounts } from "db/schema"

const {
  qboClientId,
  qboClientSecret,
  qboOauthRevocationEndpoint,
  nextauthSecret: secret,
  vercelEnv,
} = config

async function revokeAccessToken(token: string): Promise<void> {
  console.log("revoking access token")

  const encoded = base64EncodeString(`${qboClientId}:${qboClientSecret}`)
  const response = await fetch(qboOauthRevocationEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/json",
    },
    body: `{"token":"${token}"}`,
  })

  if (!response.ok) {
    throw new ApiError(
      500,
      `access token could not be revoked: ${await getResponseContent(response)}`,
    )
  }
}

export const parser = z.object({
  redirect: z.boolean().default(true),
  reconnect: z.boolean().default(false),
})
export type DisconnectBody = z.input<typeof parser>

const handler: NextApiHandler = async (req, res) => {
  if (!(req.method === "GET" || req.method === "POST")) return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  const realmId = req.query["realmId"]
  if (typeof realmId !== "string") throw new ApiError(400, "realmId not provided")

  // the caller can specify whether or not they want their access token to be disconnected
  // this is because if the user has been disconnected from within QBO then they will have
  // already revoked their tokens
  // if the user is disconnecting from within the application the tokens will need to be
  // revoked by us
  const shouldRevokeAccessToken = req.query["revoke"] === "true"
  if (session && shouldRevokeAccessToken) {
    const account = await db.query.accounts.findFirst({
      where: and(eq(accounts.userId, session.user.id), eq(accounts.realmId, realmId)),
      columns: {
        accessToken: true,
      },
    })
    if (account?.accessToken) await revokeAccessToken(account?.accessToken)
    // if the user is signed in already and disconnected there is nothing for us to do
    else return res.redirect(302, "/auth/disconnected")
  }

  await db
    .update(accounts)
    .set({
      accessToken: null,
      expiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    })
    .where(
      and(
        eq(accounts.realmId, realmId),
        session ? eq(accounts.userId, session.user.id) : undefined,
      ),
    )

  const { redirect, reconnect } = parseRequestBody(parser, req.body || {})

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
