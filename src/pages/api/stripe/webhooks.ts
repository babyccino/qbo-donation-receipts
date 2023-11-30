import { eq } from "drizzle-orm"
import { NextApiHandler, NextApiRequest } from "next"
import { Readable } from "node:stream"
import Stripe from "stripe"

import { db } from "@/lib/db/test"
import { manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import { config as envConfig } from "@/lib/util/config"
import { billingAddresses, prices, products } from "db/schema"

export const config = {
  api: {
    bodyParser: false,
  },
}

async function buffer(readable: Readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

async function getStripeEvent(req: NextApiRequest) {
  const sig = req.headers["stripe-signature"]
  const webhookSecret = envConfig.stripeWebhookSecret
  if (!sig) throw new Error("request missing stripe-signature")
  if (!webhookSecret) throw new Error("missing webhook secret")

  const buf = await buffer(req)
  return stripe.webhooks.constructEvent(buf, sig, webhookSecret)
}

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "price.created",
  "price.updated",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
])

const webhookHandler: NextApiHandler = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).end("Method Not Allowed")
  }

  try {
    const event = await getStripeEvent(req)

    if (!relevantEvents.has(event.type)) return res.json({ received: true })

    await handleEvent(event)
    res.json({ received: true })
  } catch (error: any) {
    console.error(`❌ Error message: ${error.message}`)
    console.error(error.stack)
    return res.status(400).json(`Webhook Error: ${error.message}`)
  }
}
export default webhookHandler

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "product.created":
    case "product.updated":
    case "product.deleted":
      await updateProduct(event.data.object as Stripe.Product)
      break
    case "price.created":
    case "price.updated":
    case "price.deleted":
      await upsertPrice(event.data.object as Stripe.Price)
      break
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      await Promise.all([
        manageSubscriptionStatusChange(subscription),
        event.type === "customer.subscription.updated" && addBillingAddress(subscription),
      ])
      break
    }
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session
      if (checkoutSession.mode !== "subscription") break

      const subscription = await getSubscriptionFromCheckoutSession(checkoutSession)
      await Promise.all([
        manageSubscriptionStatusChange(subscription),
        addBillingAddress(subscription),
      ])
      break
    }
    default:
      throw new Error("Unhandled relevant event!")
  }
}

function getId(product: string | { id: string } | null) {
  if (!product) throw new Error("Missing id")
  return typeof product == "string" ? product : product.id
}

async function updateProduct(data: Stripe.Product) {
  if (data.deleted) await db.delete(products).where(eq(products.id, data.id))
  else
    await db
      .insert(products)
      .values({
        id: data.id,
        active: data.active,
        name: data.name,
        metadata: data.metadata,
      })
      .onConflictDoUpdate({
        target: [products.id],
        set: {
          active: data.active,
          name: data.name,
          metadata: data.metadata,
          updatedAt: new Date(),
        },
      })
}

async function upsertPrice(data: Stripe.Price) {
  const productId = getId(data.product)
  if (data.deleted) await db.delete(prices).where(eq(prices.id, productId))
  else
    await db
      .insert(prices)
      .values({
        id: data.id,
        active: data.active,
        unitAmount: data.unit_amount ?? undefined,
        currency: data.currency,
        type: data.type,
        metadata: data.metadata,
        interval: data.recurring?.interval,
        intervalCount: data.recurring?.interval_count,
      })
      .onConflictDoUpdate({
        target: [prices.id],
        set: {
          active: data.active,
          unitAmount: data.unit_amount ?? undefined,
          currency: data.currency,
          type: data.type,
          metadata: data.metadata,
          interval: data.recurring?.interval,
          intervalCount: data.recurring?.interval_count,
          updatedAt: new Date(),
        },
      })
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

async function addBillingAddress(subscription: Stripe.Subscription) {
  const { clientId } = subscription.metadata
  if (!clientId) throw new Error("user id not found in subscription metadata")

  const paymentMethod = await getPaymentMethodFromSubscription(subscription)
  const { address, phone, name } = paymentMethod.billing_details

  await db
    .insert(billingAddresses)
    .values({
      id: subscription.id,
      userId: clientId,
      city: address?.city,
      country: address?.city,
      line1: address?.line1,
      line2: address?.line2,
      postalCode: address?.postal_code,
      state: address?.state,
      phone: phone ?? undefined,
      name: name ?? undefined,
    })
    .onConflictDoUpdate({
      target: [billingAddresses.userId],
      set: {
        city: address?.city,
        country: address?.city,
        line1: address?.line1,
        line2: address?.line2,
        postalCode: address?.postal_code,
        state: address?.state,
        phone: phone ?? undefined,
        name: name ?? undefined,
        updatedAt: new Date(),
      },
    })
}
