import { NextApiHandler, NextApiRequest } from "next"
import { Readable } from "node:stream"
import Stripe from "stripe"

import { firestorePrice, firestoreProduct, firestoreUser } from "@/lib/db"
import { hooks, stripe } from "@/lib/stripe"
import { config as envConfig } from "@/lib/util/config"

export const config = {
  api: {
    bodyParser: false,
  },
}

async function makeBuffer(readable: Readable) {
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

  const buf = await makeBuffer(req)
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

const firebaseHooks = hooks(firestoreUser, firestoreProduct, firestorePrice)
async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "product.created":
    case "product.updated":
    case "product.deleted":
      return firebaseHooks.updateProduct(event.data.object as Stripe.Product)
    case "price.created":
    case "price.updated":
    case "price.deleted":
      return firebaseHooks.upsertPrice(event.data.object as Stripe.Price)
    case "customer.subscription.created":
    case "customer.subscription.deleted":
      return firebaseHooks.createDeleteSubscription(event.data.object as Stripe.Subscription)
    case "customer.subscription.updated":
      return firebaseHooks.updateSubscription(event.data.object as Stripe.Subscription)
    case "checkout.session.completed":
      return firebaseHooks.checkoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
    default:
      throw new Error("Unhandled relevant event!")
  }
}

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
    return res.status(400).json(`Webhook Error: ${error.message}`)
  }
}
export default webhookHandler
