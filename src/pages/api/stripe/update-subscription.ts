import { eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { db } from "@/lib/db/test"
import { manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { subscriptions } from "db/schema"

export const parser = z.object({
  cancelAtPeriodEnd: z.boolean(),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async ({ body }, res, session) => {
  const data = parseRequestBody(parser, body)

  const currentSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
    columns: { id: true },
  })
  if (!currentSubscription) throw new ApiError(500, "User has no subscription")

  const subscription = await stripe.subscriptions.update(currentSubscription.id, {
    cancel_at_period_end: data.cancelAtPeriodEnd,
  })
  manageSubscriptionStatusChange(subscription)

  res.status(200).json({ subscription })
}

export default createAuthorisedHandler(handler, ["PUT"])
