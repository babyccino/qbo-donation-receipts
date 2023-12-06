import { z } from "zod"
import { ApiError } from "next/dist/server/api-utils"

import { isUserSubscribed, stripe } from "@/lib/stripe"
import { getBaseUrl } from "@/lib/util/request"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { config } from "@/lib/util/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { subscriptions } from "db/schema"

export const parser = z.object({
  redirect: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
})
export type DataType = z.input<typeof parser>

const handler: AuthorisedHandler = async ({ body }, res, session) => {
  const data = parseRequestBody(parser, body)
  const { metadata, redirect } = data

  const [subscription, stripeSession] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
      columns: { status: true, currentPeriodEnd: true },
    }),
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
  if (subscription && isUserSubscribed(subscription))
    throw new ApiError(400, "user already subscribed")

  if (!stripeSession.url) throw new ApiError(502, "stripe did not send a redirect url")

  res.status(200).json({ url: stripeSession.url })
}

export default createAuthorisedHandler(handler, ["POST"])
