import { z } from "zod"
import { ApiError } from "next/dist/server/api-utils"

import { isUserSubscribed, stripe } from "@/lib/stripe"
import { getBaseUrl } from "@/lib/util/request"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { getUserData } from "@/lib/db"
import { config } from "@/lib/util/config"
import { NextResponse } from "next/server"

export const parser = z.object({
  redirect: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
})
export type DataType = z.input<typeof parser>

const handler: AuthorisedHandler = async ({ body }, session) => {
  const data = parseRequestBody(parser, body)
  const { metadata, redirect } = data

  const [user, stripeSession] = await Promise.all([
    getUserData(session.user.id),
    stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer_email: session.user.email,
      line_items: [
        {
          price: config.stripeSubscribePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: { ...metadata, clientId: session.user.id },
      },
      success_url: `${getBaseUrl()}/${redirect || ""}`,
      cancel_url: `${getBaseUrl()}/`,
    }),
  ])
  if (!user) throw new ApiError(500, "user record was not found in db")
  if (isUserSubscribed(user)) throw new ApiError(400, "user already subscribed")

  if (!stripeSession.url) throw new ApiError(502, "stripe did not send a redirect url")

  return NextResponse.json({ url: stripeSession.url }, { status: 200 })
}

export const POST = createAuthorisedHandler(handler)
