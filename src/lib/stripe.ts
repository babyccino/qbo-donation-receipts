import Stripe from "stripe"

import { config } from "@/lib/util/config"
import { Subscription, subscriptions } from "db/schema"
import { db } from "@/lib/db/test"
import { and, eq, gt } from "drizzle-orm"

export const stripe = new Stripe(config.stripePrivateKey, { apiVersion: "2023-08-16" })

function getDate(timeStamp: number): Date
function getDate(timeStamp: number | null | undefined): Date | undefined
function getDate(timeStamp: number | null | undefined) {
  if (typeof timeStamp === "number") return new Date(timeStamp * 1000)
  else return undefined
}

export async function manageSubscriptionStatusChange(subscription: Stripe.Subscription) {
  const { clientId } = subscription.metadata
  if (!clientId) throw new Error("user id not found in subscription metadata")

  await db
    .insert(subscriptions)
    .values({
      id: subscription.id,
      userId: clientId,
      status: subscription.status,
      metadata: subscription.metadata,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: getDate(subscription.created),
      currentPeriodStart: getDate(subscription.current_period_start),
      currentPeriodEnd: getDate(subscription.current_period_end),
      endedAt: getDate(subscription.ended_at),
      cancelAt: getDate(subscription.cancel_at),
      canceledAt: getDate(subscription.canceled_at),
    })
    .onConflictDoUpdate({
      target: [subscriptions.userId],
      set: {
        id: subscription.id,
        status: subscription.status,
        metadata: subscription.metadata,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        createdAt: getDate(subscription.created),
        currentPeriodStart: getDate(subscription.current_period_start),
        currentPeriodEnd: getDate(subscription.current_period_end),
        endedAt: getDate(subscription.ended_at),
        cancelAt: getDate(subscription.cancel_at),
        canceledAt: getDate(subscription.canceled_at),
      },
    })
}

export function isUserSubscribed(subscription: Pick<Subscription, "status" | "currentPeriodEnd">) {
  if (!subscription) return false
  if (subscription.status) return subscription.status === "active"
  return subscription.currentPeriodEnd.getTime() >= new Date().getTime()
}

export const isUserSubscribedSql = and(
  eq(subscriptions.status, "active"),
  gt(subscriptions.currentPeriodEnd, new Date()),
)
