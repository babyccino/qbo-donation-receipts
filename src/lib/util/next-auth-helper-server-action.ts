"use server"

import { NextApiResponse } from "next"
import { JWT, encode } from "next-auth/jwt"
import { cookies } from "next/headers"

import { config } from "@/lib/util/config"

const { nextauthSecret, vercelEnv } = config

const sessionCookie = (vercelEnv ? "__Secure-" : "") + "next-auth.session-token"

export const serverSignOut = () => cookies().delete(sessionCookie)

export async function updateServerSession(token: JWT) {
  const encoded = await encode({ token, secret: nextauthSecret })
  cookies().set("name", encoded, {
    maxAge: 1800,
    httpOnly: true,
    secure: Boolean(vercelEnv),
    sameSite: "lax",
    path: "/",
  })
}
