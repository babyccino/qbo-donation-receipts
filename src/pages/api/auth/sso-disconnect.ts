import { NextApiHandler } from "next"

import { serverSignIn } from "@/lib/auth/next-auth-helper-server"

const handler: NextApiHandler = async (req, res) => {
  await serverSignIn("QBO-disconnected", req, res, true)
}
export default handler
