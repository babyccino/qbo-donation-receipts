import { z } from "zod"
import { ApiError } from "next/dist/server/api-utils"

import { isUserSubscribed, stripe } from "@/lib/stripe"
import { getBaseUrl } from "@/lib/util/request"
import { AuthorisedHanlder, parseRequestBody, createAuthorisedHandler } from "@/lib/app-api"
import { user } from "@/lib/db"

export const parser = z.object({
  redirect: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
})
export type DataType = Partial<z.infer<typeof parser>>

const handler: AuthorisedHanlder = async ({ body }, res, session) => {
  const data = parseRequestBody(parser, body)
  const { metadata, redirect } = data
  const priceId = process.env.STRIPE_SUBSCRIBE_PRICE_ID

  const [dbSnap, stripeSession] = await Promise.all([
    user.doc(session.user.id).get(),
    stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
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

  const dbUser = dbSnap.data()
  if (!dbUser) throw new ApiError(500, "user record was not found in db")
  if (isUserSubscribed(dbUser)) throw new ApiError(400, "user already subscribed")

  if (!stripeSession.url) throw new ApiError(502, "stripe did not send a redirect url")

  res.status(200).json({ url: stripeSession.url })
}

export default createAuthorisedHandler(handler, ["POST"])
