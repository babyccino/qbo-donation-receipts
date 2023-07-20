import { base64EncodeString, getResponseContent } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import { isSessionQboConnected } from "@/lib/app-api"
import { serverSignIn, updateServerSession } from "@/lib/util/next-auth-helper"
import { getToken } from "next-auth/jwt"
import { ApiError } from "next/dist/server/api-utils"
import { NextApiHandler } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

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
    throw new Error(`access token could not be revoked: ${await getResponseContent(response)}`)
  }
}

const handler: NextApiHandler = async (req, res) => {
  if (!(req.method === "GET" || req.method === "POST")) return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)

  // if user is not signed in, sign them in, then return to this route
  if (!session) return serverSignIn(req, res, true, "/api/disconnect")

  if (!isSessionQboConnected(session)) {
    return res.redirect(302, "/auth/disconnected")
  }

  const token = await getToken({ req, secret, secureCookie: Boolean(vercelEnv) })
  if (!token) throw new ApiError(500, "Client has session but session token was not found")

  token.accessToken = null
  await Promise.all([revokeAccessToken(session.accessToken), updateServerSession(res, token)])

  res.redirect(302, "/auth/disconnected")
}
export default handler
