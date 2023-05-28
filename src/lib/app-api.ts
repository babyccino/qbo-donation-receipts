import { TypeOf, ZodObject, ZodRawShape, z } from "zod"
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { Session, getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"

import { authOptions } from "src/pages/api/auth/[...nextauth]"
import { User } from "@/types/db"

export function alreadyFilledIn(doc: FirebaseFirestore.DocumentSnapshot<User>): {
  items: boolean
  doneeDetails: boolean
} {
  const dbData = doc.data()

  if (!dbData) return { items: false, doneeDetails: false }

  const { items, donee, date } = dbData
  const {
    companyAddress,
    companyName,
    country,
    registrationNumber,
    signatoryName,
    signature,
    smallLogo,
  } = donee || {}

  return {
    items: Boolean(items && date),
    doneeDetails: Boolean(
      companyAddress &&
        companyName &&
        country &&
        registrationNumber &&
        signatoryName &&
        signature &&
        smallLogo
    ),
  }
}

export function parseRequestBody<T extends ZodRawShape>(shape: T, body: any): TypeOf<ZodObject<T>> {
  const response = z.object(shape).safeParse(body)

  if (!response.success) {
    const { errors } = response.error

    throw new ApiError(400, JSON.stringify(errors))
  }

  return response.data
}

export type AuthorisedHanlder = (
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) => Promise<void>

export const createAuthorisedHandler =
  (handler: AuthorisedHanlder, methods: string[]): NextApiHandler =>
  async (req, res) => {
    console.log("handler")
    if (!req.method || !methods.includes(req.method)) {
      return res.status(405).end()
    }

    const session = await getServerSession(req, res, authOptions)
    if (!session) return res.status(401).end()

    try {
      handler(req, res, session)
    } catch (error) {
      console.error(error)
      if (!(error instanceof ApiError)) return res.status(404).json({ message: "server error" })

      res.status(error.statusCode).json(error)
    }
  }
