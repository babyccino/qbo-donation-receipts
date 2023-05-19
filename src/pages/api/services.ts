import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { user } from "@/lib/db"
import { authOptions } from "./auth/[...nextauth]"
import { parseRequestBody } from "@/lib/app-api"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(404).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()
  const id = session.user.id

  try {
    const data = parseRequestBody(
      {
        items: z.array(z.number()),
        date: z.object({
          startDate: z.date(),
          endDate: z.date(),
        }),
      },
      req.body
    )

    await user.doc(id).update(data)

    res.status(200).json(data)
  } catch (error) {
    console.error(error)
    return res.status(400).end()
  }
}
