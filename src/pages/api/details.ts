import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"

import { user } from "@/lib/db"
import { authOptions } from "./auth/[...nextauth]"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(404).end()

  const session = await getServerSession(req, res, authOptions)

  if (!session) return res.status(401).end()

  const id = session.user.id

  try {
    await user.doc(id).update({ donee: JSON.parse(req.body) })

    res.status(200).end()
  } catch (error) {
    return res.status(400).end()
  }
}
