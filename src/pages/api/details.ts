import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { user } from "@/lib/db"
import { authOptions } from "./auth/[...nextauth]"
import { parseRequestBody } from "@/lib/parse"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()
  const id = session.user.id

  try {
    const data = parseRequestBody(
      {
        companyName: z.string(),
        companyAddress: z.string(),
        country: z.string(),
        registrationNumber: z.string(),
        signatoryName: z.string(),
        signature: z.string(),
        smallLogo: z.string(),
      },
      req.body
    )

    await user.doc(id).update(data)

    res.status(200).end()
  } catch (error) {
    console.error(error)
    return res.status(400).json(error)
  }
}
