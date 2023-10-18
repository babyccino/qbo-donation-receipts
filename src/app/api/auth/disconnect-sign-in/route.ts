import { NextRequest } from "next/server"

import { serverSignIn } from "@/lib/util/next-auth-helper-server"

export const GET = async (req: NextRequest) => {
  return serverSignIn("QBO-disconnected", req)
}
