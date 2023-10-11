import { NextApiHandler, NextApiRequest, NextApiResponse } from "next"
import { ApiError } from "next/dist/server/api-utils"
import { Session, getServerSession } from "next-auth"

import { authOptions } from "@/auth"
import { TypeOf, ZodObject, ZodRawShape } from "zod"
import { NextRequest, NextResponse } from "next/server"

export function parseRequestBody<T extends ZodRawShape>(
  shape: ZodObject<T>,
  body: any,
): TypeOf<ZodObject<T>> {
  const response = shape.safeParse(body)

  if (!response.success) {
    const { errors } = response.error

    throw new ApiError(400, JSON.stringify(errors))
  }

  return response.data
}

export type AuthorisedHandler = (req: NextRequest, session: Session) => Promise<Response>
// type ErrorTypes = { message: string } | ApiError
export function createAuthorisedHandler<T>(handler: AuthorisedHandler, redirect?: string) {
  return async (req: NextRequest) => {
    console.log(`${req.method} request made to ${req.url}`)

    const session = await getServerSession(authOptions)
    if (!session && redirect) {
      return NextResponse.redirect(redirect)
    }

    if (!session) {
      return NextResponse.json({}, { status: 401 })
    }

    try {
      return await handler(req, session)
    } catch (error) {
      console.error(error)
      if (!(error instanceof ApiError))
        return NextResponse.json({ message: "server error" }, { status: 404 })

      return NextResponse.json(error, { status: error.statusCode })
    }
  }
}
