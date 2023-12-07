import { NextApiResponse, Redirect } from "next"
import { ApiError } from "next/dist/server/api-utils"
import { getCsrfToken } from "next-auth/react"
import { encode, JWT } from "next-auth/jwt"
import { getServerSession } from "next-auth"
import { cookies as getCookies } from "next/headers"

import crypto from "@/lib/crypto"
import { getBaseUrl } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import { authOptions } from "@/auth"
import { IncomingMessage, ServerResponse } from "http"
import { NextRequest, NextResponse } from "next/server"

const { nextauthSecret, vercelEnv } = config

const sessionCookie = (vercelEnv ? "__Secure-" : "") + "next-auth.session-token"
const callbackCookie = (vercelEnv ? "__Secure-" : "") + "next-auth.callback-url"
const csrfCookie = (vercelEnv ? "__Host-" : "") + "next-auth.csrf-token"

export const serverSignOut = (res: NextApiResponse) =>
  res.setHeader("Set-Cookie", [
    sessionCookie +
      "=; expires=Thu, Jan 01 1970 00:00:00 UTC; path=/; HttpOnly; Secure; SameSite=Lax",
  ])

async function hash(value: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hash))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function getCsrfTokenAndHash(
  cookie: string | undefined,
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

export async function serverSignIn(
  provider: string,
  req: NextRequest,
  redirect: boolean = true,
  callbackUrl: string = "/",
) {
  const { csrfToken, csrfTokenHash } = await getCsrfTokenAndHash(
    req.cookies.get("next-auth.csrf-token")?.value,
  )
  const cookie = `${csrfCookie}=${csrfToken}|${csrfTokenHash}`
  const url = `${getBaseUrl()}api/auth/signin/${provider}`
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
      callbackUrl,
      json: "true",
    }),
  }
  const response = await fetch(url, opt)
  const data = (await response.json()) as { url: string }

  const cookies = response.headers.get("Set-Cookie") as string

  const splitCookiess = splitCookies(cookies)
  const nextResponse = redirect
    ? NextResponse.redirect(data.url, {
        status: 302,
      })
    : NextResponse.json({ redirect: response.redirected }, { status: 200 })
  for (const cookie of splitCookiess) nextResponse.headers.append("Set-Cookie", cookie)

  return nextResponse
}

export async function updateServerSession(res: NextResponse, token: JWT) {
  const encoded = await encode({ token, secret: nextauthSecret })
  res.headers.append(
    "Set-Cookie",
    `${sessionCookie}=${encoded}; path=/; MaxAge=1800 HttpOnly; ${
      vercelEnv ? "Secure; " : ""
    }SameSite=Lax`,
  )
  return res
}

type Request = IncomingMessage & {
  cookies: Partial<{
    [key: string]: string
  }>
}
export async function getServerSessionOrThrow(req: Request, res: ServerResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) throw new ApiError(500, "Couldn't find session")
  return session
}

export const disconnectedRedirect: { redirect: Redirect } = {
  redirect: { permanent: false, destination: "/auth/disconnected" },
}
