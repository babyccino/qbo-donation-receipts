import Stripe from "stripe"

import { config } from "@/lib/util/config"
import { RequiredField } from "@/lib/util/etc"
import { PriceData, ProudctData, User, UserData } from "@/types/db"

export const stripe = new Stripe(config.stripePrivateKey, { apiVersion: "2023-08-16" })

function getDate(timeStamp: number): Date
function getDate(timeStamp: number | null | undefined): Date | undefined
function getDate(timeStamp: number | null | undefined) {
  if (typeof timeStamp === "number") return new Date(timeStamp * 1000)
  else return undefined
}
export async function manageSubscriptionStatusChange(
  user: UserData,
  subscription: Stripe.Subscription,
) {
  const { clientId } = subscription.metadata
  if (!clientId) throw new Error("user id not found in subscription metadata")

  return await user.set(clientId, {
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
  })
}

export function isUserSubscribed(user: User): user is RequiredField<User, "subscription"> {
  const { subscription } = user
  if (!subscription) return false
  if (subscription.status) return subscription.status === "active"
  return subscription.currentPeriodEnd.getTime() >= new Date().getTime()
}

function getId(product: string | { id: string } | null) {
  if (!product) throw new Error("Missing id")
  return typeof product == "string" ? product : product.id
}

async function getSubscriptionFromCheckoutSession({
  subscription,
}: Stripe.Checkout.Session): Promise<Stripe.Subscription> {
  if (!subscription) throw new Error("session did not contain subscription data")
  if (typeof subscription === "string")
    return await stripe.subscriptions.retrieve(subscription, {
      expand: ["default_payment_method"],
    })
  return subscription
}

async function getPaymentMethodFromSubscription({
  default_payment_method: paymentMethod,
}: Stripe.Subscription): Promise<Stripe.PaymentMethod> {
  if (!paymentMethod) throw new Error("payment method was not found in subscription object")
  if (typeof paymentMethod === "string")
    return await stripe.paymentMethods.retrieve(paymentMethod, { expand: ["billing_details"] })
  return paymentMethod
}

export const hooks = (user: UserData, product: ProudctData, price: PriceData) => ({
  async updateProduct(data: Stripe.Product) {
    if (data.deleted) await product.delete(data.id)
    else
      await product.set(data.id, {
        id: data.id,
        active: data.active,
        name: data.name,
        metadata: data.metadata,
      })
  },
  async upsertPrice(data: Stripe.Price) {
    const productId = getId(data.product)
    if (data.deleted) await price.delete(productId)
    else
      await price.set(productId, {
        id: data.id,
        active: data.active,
        unitAmount: data.unit_amount ?? undefined,
        currency: data.currency,
        type: data.type,
        metadata: data.metadata,
        interval: data.recurring?.interval,
        intervalCount: data.recurring?.interval_count,
      })
  },
  async addBillingAddress(subscription: Stripe.Subscription) {
    const { clientId } = subscription.metadata
    if (!clientId) throw new Error("user id not found in subscription metadata")

    const paymentMethod = await getPaymentMethodFromSubscription(subscription)
    const { address, phone, name } = paymentMethod.billing_details

    return await user.set(clientId, {
      billingAddress: {
        address: address ?? undefined,
        phone: phone ?? undefined,
        name: name ?? undefined,
      },
    })
  },
  async createDeleteSubscription(subscription: Stripe.Subscription) {
    await manageSubscriptionStatusChange(user, subscription)
  },
  async updateSubscription(subscription: Stripe.Subscription) {
    await Promise.all([
      manageSubscriptionStatusChange(user, subscription),
      this.addBillingAddress(subscription),
    ])
  },
  async checkoutSessionCompleted(checkoutSession: Stripe.Checkout.Session) {
    if (checkoutSession.mode !== "subscription") return

    const subscription = await getSubscriptionFromCheckoutSession(checkoutSession)
    await Promise.all([
      manageSubscriptionStatusChange(user, subscription),
      this.addBillingAddress(subscription),
    ])
  },
})
