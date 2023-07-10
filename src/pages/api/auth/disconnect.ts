import { base64EncodeString, getResponseContent } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import { AuthorisedHanlder, createAuthorisedHandler } from "@/lib/app-api"
import { serverSignOut } from "@/lib/util/next-auth-helper"

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
    throw new Error(`access token could not be revoked: ${await getResponseContent(response)}`)
  }
}

const handler: AuthorisedHanlder = async (req, res, session) => {
  await revokeAccessToken(session.accessToken)
  serverSignOut(res)
  res.status(200).redirect("/disconnected")
}
export default createAuthorisedHandler(handler, ["POST", "GET"], "/")
