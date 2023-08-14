import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { base64EncodeString, getResponseContent } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import { isSessionQboConnected } from "@/lib/util/next-auth-helper"
import { serverSignIn, updateServerSession } from "@/lib/util/next-auth-helper-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { parseRequestBody } from "@/lib/util/request-server"
import { getToken } from "next-auth/jwt"
import { QboPermission } from "@/types/next-auth-helper"
import { user } from "@/lib/db"

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
      `access token could not be revoked: ${await getResponseContent(response)}`
    )
  }
}

async function disconnectClient(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret, secureCookie: Boolean(vercelEnv) })
  if (!token) throw new ApiError(500, "Client has session but session token was not found")

  token.accessToken = null
  token.realmId = null
  token.qboPermission = QboPermission.None
  return updateServerSession(res, token)
}

export const parser = z.object({
  redirect: z.boolean().default(true),
  reconnect: z.boolean().default(false),
})
export type DisconnectBody = z.input<typeof parser>

const handler: NextApiHandler = async (req, res) => {
  if (!(req.method === "GET" || req.method === "POST")) return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)

  if (session) user.doc(session.user.id).set({ connected: false }, { merge: true })

  // the caller can specify whether or not they want their access token to be disconnected
  // this is because if the user has been disconnected from within QBO then they will have
  // already revoked their tokens
  // if the user is disconnecting from within the application the tokens will need to be
  // revoked by us
  const shouldRevokeAccessToken = req.query["revoke"] === "true"
  if (session && session.accessToken && shouldRevokeAccessToken)
    await revokeAccessToken(session.accessToken)

  // if the user is signed in already and disconnected there is nothing for us to do
  if (session && !isSessionQboConnected(session)) return res.redirect(302, "/auth/disconnected")

  const { redirect, reconnect } = parseRequestBody(parser, req.body)

  // if reconnect is specified user will be re-signed in, without the accounting permissions
  // i.e. signed in, in the `disconnected` state
  // if the user is not signed in they will also need to be signed in, in this state
  if (reconnect || !session) {
    const redirectUrl = await serverSignIn(
      "QBO-disconnected",
      req,
      res,
      redirect,
      "/auth/disconnected"
    )

    if (redirect) return
    else res.status(200).json({ redirect: redirectUrl })
  } else {
    // no longer valid access tokens need to be removed from the user's session
    await disconnectClient(req, res)

    if (redirect) res.redirect(302, "/auth/disconnected")
    else res.status(200).json({ redirect: "/auth/disconnected" })
  }
}
export default handler
