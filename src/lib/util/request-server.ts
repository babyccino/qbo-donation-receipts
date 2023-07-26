import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { ApiError } from "next/dist/server/api-utils"
import { Session, getServerSession } from "next-auth"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { TypeOf, ZodObject, ZodRawShape } from "zod"

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
