import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"

import { authOptions } from "@/auth"
import { serverSignIn } from "@/lib/util/next-auth-helper-server"

export const GET = async (req: NextRequest) => {
  const session = await getServerSession(authOptions)
  if (session) return NextResponse.redirect("/", 302)

  console.log({ session })

  return serverSignIn("QBO", req)
}
