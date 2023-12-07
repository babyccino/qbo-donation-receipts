import { NextRequest } from "next/server"

import { serverSignIn } from "@/lib/auth/next-auth-helper-server-app"

export const GET = async (req: NextRequest) => {
  return serverSignIn("QBO", req)
}
