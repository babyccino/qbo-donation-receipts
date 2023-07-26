import Stripe from "stripe"

import { user } from "@/lib/db"
import { User } from "@/types/db"
import { config } from "@/lib/util/config"

export const stripe = new Stripe(config.stripePrivateKey ?? "", { apiVersion: "2022-11-15" })

function getDate(timeStamp: number): Date
function getDate(timeStamp: number | null | undefined): Date | undefined
function getDate(timeStamp: number | null | undefined) {
  if (typeof timeStamp === "number") return new Date(timeStamp * 1000)
  else return undefined
}
export async function manageSubscriptionStatusChange(subscription: Stripe.Subscription) {
  const { clientId } = subscription.metadata
  if (!clientId) throw new Error("user id not found in subscription metadata")

  return await user.doc(clientId).set(
    {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        metadata: subscription.metadata,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        created: getDate(subscription.created),
        currentPeriodStart: getDate(subscription.current_period_start),
        currentPeriodEnd: getDate(subscription.current_period_end),
        endedAt: getDate(subscription.ended_at),
        cancelAt: getDate(subscription.cancel_at),
        canceledAt: getDate(subscription.canceled_at),
      },
    },
    { merge: true }
  )
}

export function isUserSubscribed({ subscription }: User) {
  if (!subscription) return false
  if (subscription.status) return subscription.status === "active"
  return subscription.currentPeriodEnd.getTime() >= new Date().getTime()
}
