import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

import { QboPermission } from "./types/next-auth-helper"

// TODO write custom middleware so signed in users can be redirected from signin page and that page can be made static
const secret = process.env.NEXTAUTH_SECRET
const redirect = (req: NextRequest, path: string) =>
  NextResponse.redirect(new URL(req.nextUrl.basePath + path, req.nextUrl.origin))
const qboConnectedRoutes = ["/details", "/email", "/generate-receipts", "/items"]
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret })
  const { pathname } = req.nextUrl
  if (req.nextUrl.pathname === "/auth/signin") return token ? redirect(req, "/") : null
  if (!token) return redirect(req, "/auth/signin")
  if (token.qboPermission !== QboPermission.Accounting && qboConnectedRoutes.includes(pathname))
    return redirect(req, "/auth/disconnected")
}

export const config = {
  matcher: [
    "/auth/signin",
    "/api/stripe/create-checkout-session",
    "/api/stripe/update-subscription",
    "/api/details",
    "/api/items",
    "/api/receipts",
    "/api/email",
    "/api/support",
    "/details",
    "/generate-receipts",
    "/items",
    "/account",
    "/email",
    "/subscribe",
  ],
}
