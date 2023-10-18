import { NextRequest, NextResponse } from "next/server"

import { getServerSession } from "@/app/auth-util"
import { serverSignIn } from "@/lib/util/next-auth-helper-server"

export const GET = async (req: NextRequest) => {
  const session = await getServerSession()
  if (session) return NextResponse.redirect("/", 302)

  return serverSignIn("QBO", req)
}
