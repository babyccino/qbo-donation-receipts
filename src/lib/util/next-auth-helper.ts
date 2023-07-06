import { NextApiResponse, NextApiRequest } from "next"
import { getCsrfToken } from "next-auth/react"
import { getToken } from "next-auth/jwt"

import { getBaseUrl } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import crypto from "@/lib/crypto"
import { config } from "@/lib/util/config"

const { nextAuthSecret } = config

export const serverSignOut = (res: NextApiResponse) =>
  res.setHeader("Set-Cookie", [
    "next-auth.session-token=deleted; maxAge=0; path=/; sameSite=Lax",
    "next-auth.callback-url=deleted; maxAge=0; path=/; sameSite=Lax",
    "next-auth.csrf-token=deleted; maxAge=0; path=/; sameSite=Lax",
  ])

async function getCsrfTokenAndHash(
  cookie: string | undefined
): Promise<{ readonly csrfToken: string; readonly csrfTokenHash: string }> {
  if (cookie) {
    const split = cookie.split("|")
    return { csrfToken: split[0], csrfTokenHash: split[1] }
  }

  const csrfToken = (await getCsrfToken()) ?? ""
  return { csrfToken, csrfTokenHash: await hash(csrfToken + nextAuthSecret) }
}

async function hash(value: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hash))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

export const serverSignIn = async (
  req: NextApiRequest,
  res: NextApiResponse,
  redirect: boolean
) => {
  const token = await getToken({
    req,
    secret: nextAuthSecret,
  })

  const { csrfToken, csrfTokenHash } = await getCsrfTokenAndHash(
    req.cookies["next-auth.csrf-token"]
  )
  const cookie = `${csrfToken}|${csrfTokenHash}`
  const url = `${getBaseUrl()}/api/auth/signin/${authOptions.providers[0].id}`
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      cookie: `next-auth.csrf-token=${cookie}`,
    },
    credentials: "include",
    redirect: "follow",
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: "/",
      json: "true",
    }),
  })
  const data = (await response.json()) as { url: string }

  const cookies = response.headers.get("Set-Cookie") as string

  res.setHeader("Set-Cookie", cookies.split("SameSite=Lax, "))
  if (redirect) res.redirect(302, data.url)

  return data.url
}