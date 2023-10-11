import { NextApiHandler } from "next"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/auth"
import { serverSignIn } from "@/lib/util/next-auth-helper-server"
import { NextRequest, NextResponse } from "next/server"

export const GET = async (req: NextRequest, res: NextResponse) => {
  const session = await getServerSession(authOptions)
  if (session) return NextResponse.redirect("/", 302)

  console.log({ session })

  return serverSignIn("QBO", req)
}
