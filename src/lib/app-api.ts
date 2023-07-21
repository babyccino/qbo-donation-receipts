import { TypeOf, ZodObject, ZodRawShape } from "zod"
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { Session, getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"

import { authOptions } from "src/pages/api/auth/[...nextauth]"
import { User } from "@/types/db"
import { QboConnectedSession } from "@/lib/qbo-api"

export function alreadyFilledIn(user: User | undefined): {
  items: boolean
  doneeDetails: boolean
} {
  if (!user) return { items: false, doneeDetails: false }

  const { items, donee, date } = user
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

export function parseRequestBody<T extends ZodRawShape>(
  shape: ZodObject<T>,
  body: any
): TypeOf<ZodObject<T>> {
  const response = shape.safeParse(body)

  if (!response.success) {
    const { errors } = response.error

    throw new ApiError(400, JSON.stringify(errors))
  }

  return response.data
}

export type AuthorisedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session
) => Promise<unknown>
type HttpVerb = "POST" | "GET" | "PUT" | "PATCH" | "DELETE"
export const createAuthorisedHandler =
  (handler: AuthorisedHandler, methods: HttpVerb[], redirect?: string): NextApiHandler =>
  async (req, res) => {
    console.log(`${req.method} request made to ${req.url}`)
    if (!req.method || !methods.includes(req.method as HttpVerb)) {
      return res.status(405).end()
    }

    const session = await getServerSession(req, res, authOptions)
    if (!session && redirect) {
      return res.redirect(302, redirect)
    }

    if (!session) {
      return res.status(401).end()
    }

    try {
      await handler(req, res, session)
    } catch (error) {
      console.error(error)
      if (!(error instanceof ApiError)) return res.status(404).json({ message: "server error" })

      res.status(error.statusCode).json(error)
    }
  }

export const isSessionQboConnected = (session: Session): session is QboConnectedSession =>
  Boolean(session.accessToken)
export function assertSessionIsQboConnected(
  session: Session
): asserts session is QboConnectedSession {
  if (!session.accessToken) throw new ApiError(401, "user not qbo connected")
}
