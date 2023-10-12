import { z } from "zod"
import { ApiError } from "next/dist/server/api-utils"

import { manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { getUserData } from "@/lib/db"
import { NextResponse } from "next/server"

const parser = z.object({
  cancelAtPeriodEnd: z.boolean(),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async ({ body }, session) => {
  const data = parseRequestBody(parser, body)

  const user = await getUserData(session.user.id)
  if (!user.subscription) throw new ApiError(500, "User is not subscribed")

  const subscription = await stripe.subscriptions.update(user.subscription.id, {
    cancel_at_period_end: data.cancelAtPeriodEnd,
  })
  manageSubscriptionStatusChange(subscription)

  return NextResponse.json({ subscription }, { status: 200 })
}

export const PUT = createAuthorisedHandler(handler)
