import { NextApiHandler } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { base64EncodeString, getResponseContent } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import { serverSignIn } from "@/lib/util/next-auth-helper"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { parseRequestBody } from "@/lib/util/request-server"

const { qboClientId, qboClientSecret, qboOauthRevocationEndpoint } = config

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

export const parser = z.object({
  redirect: z.boolean().default(true),
})
export type DisconnectBody = z.infer<typeof parser>

const handler: NextApiHandler = async (req, res) => {
  if (!(req.method === "GET" || req.method === "POST")) return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)

  // if the user is signed in already and disconnected just redirect to the information page
  if (session && !session.connected) return res.redirect(302, "/auth/disconnected")
  const shouldRevokeAccessToken = req.query["revoke"] === "true"
  if (session && shouldRevokeAccessToken) await revokeAccessToken(session.accessToken)

  const { redirect } = parseRequestBody(parser, req.body)
  const redirectUrl = await serverSignIn(
    "QBO-disconnected",
    req,
    res,
    redirect,
    "/auth/disconnected"
  )
  if (redirect) return
  else res.status(200).json({ redirect: redirectUrl })
}
export default handler
