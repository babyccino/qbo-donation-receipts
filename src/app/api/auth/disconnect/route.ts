import { NextApiRequest, NextApiResponse } from "next"
import { getToken } from "next-auth/jwt"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

import { authOptions } from "@/auth"
import { user } from "@/lib/db"
import { config } from "@/lib/util/config"
import { base64EncodeString } from "@/lib/util/image-helper"
import { isSessionQboConnected } from "@/lib/util/next-auth-helper"
import { serverSignIn, updateServerSession } from "@/lib/util/next-auth-helper-server"
import { getResponseContent } from "@/lib/util/request"
import { parseRequestBody } from "@/lib/util/request-server"
import { QboPermission } from "@/types/next-auth-helper"
import { getServerSession, getServerSessionOrThrow } from "@/app/auth-util"

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

async function disconnectClient(req: NextRequest, res: NextResponse) {
  const token = await getToken({ req, secret, secureCookie: Boolean(vercelEnv) })
  if (!token) throw new ApiError(500, "Client has session but session token was not found")

  token.accessToken = null
  token.realmId = null
  token.qboPermission = QboPermission.None
  return updateServerSession(res, token)
}

async function disconnectUserByRealmId(realmId: string) {
  const query = await user.where("realmId", "==", realmId).get()
  if (query.empty) return
  const promises = query.docs.map(doc => doc.ref.set({ connected: false }, { merge: true }))
  await Promise.all(promises)
}

const parser = z.object({
  redirect: z.boolean().default(true),
  reconnect: z.boolean().default(false),
})
export type DisconnectBody = z.input<typeof parser>

const handler = async (req: NextRequest) => {
  const session = await getServerSession()

  const { searchParams } = req.nextUrl
  const realmId = searchParams.get("query")
  if (session) user.doc(session.user.id).set({ connected: false }, { merge: true })
  else if (typeof realmId === "string") disconnectUserByRealmId(realmId)

  // the caller can specify whether or not they want their access token to be disconnected
  // this is because if the user has been disconnected from within QBO then they will have
  // already revoked their tokens
  // if the user is disconnecting from within the application the tokens will need to be
  // revoked by us
  const shouldRevokeAccessToken = searchParams.get("revoke") === "true"
  if (session && session.accessToken && shouldRevokeAccessToken)
    await revokeAccessToken(session.accessToken)

  // if the user is signed in already and disconnected there is nothing for us to do
  if (session && !isSessionQboConnected(session)) return NextResponse.redirect("/auth/disconnected")

  const { redirect, reconnect } = parseRequestBody(parser, req.body || {})

  // if reconnect is specified user will be re-signed in, without the accounting permissions
  // i.e. signed in, in the `disconnected` state
  // if the user is not signed in they will also need to be signed in, in this state
  if (reconnect || !session) {
    return serverSignIn("QBO-disconnected", req, redirect, "/auth/disconnected")
  } else {
    // no longer valid access tokens need to be removed from the user's session
    const response = redirect
      ? NextResponse.redirect("/auth/disconnected")
      : NextResponse.json({ redirect: "/auth/disconnected" })
    return await disconnectClient(req, response)
  }
}
export const GET = handler
export const POST = handler
