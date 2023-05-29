import { z } from "zod"

import { stripe } from "@/lib/stripe"
import { getBaseUrl } from "@/lib/util/request"
import { AuthorisedHanlder, createAuthorisedHandler, parseRequestBody } from "@/lib/app-api"
import { ApiError } from "next/dist/server/api-utils"

const handler: AuthorisedHanlder = async ({ body }, res, session) => {
  const data = parseRequestBody(
    {
      quantity: z.number().default(1),
      metadata: z.record(z.string(), z.any()).default({}),
    },
    body
  )
  const { quantity, metadata } = data
  const priceId = process.env.STRIPE_SUBSCRIBE_PRICE_ID

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    billing_address_collection: "required",
    customer_email: session.user.email,
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    mode: "subscription",
    subscription_data: {
      metadata: { ...metadata, clientId: session.user.id },
    },
    success_url: `${getBaseUrl()}/`,
    cancel_url: `${getBaseUrl()}/`,
  })

  if (!stripeSession.url) throw new ApiError(502, "stripe did not send a redirect url")

  res.status(200).json({ url: stripeSession.url })
}

export default createAuthorisedHandler(handler, ["POST"])
