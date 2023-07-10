import { NextApiResponse, NextApiRequest } from "next"
import { getCsrfToken } from "next-auth/react"

import { getBaseUrl } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import crypto from "@/lib/crypto"
import { config } from "@/lib/util/config"

const defaultProviderId = authOptions.providers[0].id
const { nextauthSecret, vercelEnv } = config

const sessionCookie = (vercelEnv ? "__Secure-" : "") + "next-auth.session-token"
const callbackCookie = (vercelEnv ? "__Secure-" : "") + "next-auth.callback-url"
const csrfCookie = (vercelEnv ? "__Host-" : "") + "next-auth.csrf-token"

export const serverSignOut = (res: NextApiResponse) =>
  res.setHeader("Set-Cookie", [
    sessionCookie + "=deleted; maxAge=0; path=/; sameSite=Lax",
    callbackCookie + "=deleted; maxAge=0; path=/; sameSite=Lax",
    csrfCookie + "=deleted; maxAge=0; path=/; sameSite=Lax",
  ])

async function hash(value: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hash))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function getCsrfTokenAndHash(
  cookie: string | undefined
): Promise<{ readonly csrfToken: string; readonly csrfTokenHash: string }> {
  if (cookie) {
    const split = cookie.split("|")
    return { csrfToken: split[0], csrfTokenHash: split[1] }
  }

  const csrfToken = (await getCsrfToken()) ?? ""
  return { csrfToken, csrfTokenHash: await hash(csrfToken + nextauthSecret) }
}

const splitStr = "SameSite=Lax, "
function splitCookies(cookie: string): string[] {
  const splits = []
  let start = 0
  while (true) {
    const found = cookie.indexOf(splitStr, start + 1)
    if (found === -1) {
      if (start < cookie.length) splits.push(cookie.slice(start))
      break
    }
    const end = found + splitStr.length
    splits.push(cookie.substring(start, end))
    start = end
  }
  return splits
}

export async function serverSignIn(req: NextApiRequest, res: NextApiResponse, redirect: boolean) {
  const { csrfToken, csrfTokenHash } = await getCsrfTokenAndHash(
    req.cookies["next-auth.csrf-token"]
  )
  const cookie = `${csrfCookie}=${csrfToken}|${csrfTokenHash}`
  const url = `${getBaseUrl()}api/auth/signin/${defaultProviderId}`
  const opt = {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
      cookie,
    },
    credentials: "include" as const,
    redirect: "follow" as const,
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: "/",
      json: "true",
    }),
  }
  const response = await fetch(url, opt)
  const data = (await response.json()) as { url: string }

  const cookies = response.headers.get("Set-Cookie") as string

  res.setHeader("Set-Cookie", splitCookies(cookies))
  if (redirect) res.redirect(302, data.url)

  return data.url
}
