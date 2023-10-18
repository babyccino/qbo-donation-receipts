import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

import { user as firebaseUser } from "@/lib/db"
import { UserData } from "@/types/db"
export const parser = z.object({
  cancelAtPeriodEnd: z.boolean(),
})
export type DataType = z.infer<typeof parser>

export const createHandler = (user: UserData) =>
  (async (req, res, session) => {
    const data = parseRequestBody(parser, req.body)

    const userData = await user.getOrThrow(session.user.id)
    if (!userData.subscription) throw new ApiError(500, "User is not subscribed")

    const subscription = await stripe.subscriptions.update(userData.subscription.id, {
      cancel_at_period_end: data.cancelAtPeriodEnd,
    })
    manageSubscriptionStatusChange(user, subscription)

    res.status(200).json({ subscription })
  }) satisfies AuthorisedHandler

export default createAuthorisedHandler(authOptions, createHandler(firebaseUser), ["POST"])
