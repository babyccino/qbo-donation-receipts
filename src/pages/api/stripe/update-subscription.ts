import { z } from "zod"
import { ApiError } from "next/dist/server/api-utils"

import { manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import { AuthorisedHandler, createAuthorisedHandler, parseRequestBody } from "@/lib/app-api"
import { user } from "@/lib/db"

export const parser = z.object({
  cancelAtPeriodEnd: z.boolean(),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async ({ body }, res, session) => {
  const data = parseRequestBody(parser, body)
  const doc = user.doc(session.user.id)
  const dbUser = (await doc.get()).data()
  if (!dbUser) throw new ApiError(500, "User was not found in database")
  if (!dbUser.subscription) throw new ApiError(500, "User is not subscribed")

  const subscription = await stripe.subscriptions.update(dbUser.subscription.id, {
    cancel_at_period_end: data.cancelAtPeriodEnd,
  })
  manageSubscriptionStatusChange(subscription)

  res.status(200).json({ subscription })
}

export default createAuthorisedHandler(handler, ["PUT"])
