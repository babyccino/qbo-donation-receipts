import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { user as firebaseUser } from "@/lib/db"
import { isUserSubscribed, stripe } from "@/lib/stripe"
import { config } from "@/lib/util/config"
import { getBaseUrl } from "@/lib/util/request"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { UserData } from "@/types/db"

export const parser = z.object({
  redirect: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
})
export type DataType = z.input<typeof parser>

export const createHandler = (user: UserData) =>
  (async (req, res, session) => {
    const data = parseRequestBody(parser, req.body)
    const { metadata, redirect } = data

    const [userData, stripeSession] = await Promise.all([
      user.get(session.user.id),
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
    if (!userData) throw new ApiError(500, "user record was not found in db")
    if (isUserSubscribed(userData)) throw new ApiError(400, "user already subscribed")

    if (!stripeSession.url) throw new ApiError(502, "stripe did not send a redirect url")
  }) satisfies AuthorisedHandler

export default createAuthorisedHandler(authOptions, createHandler(firebaseUser), ["POST"])
