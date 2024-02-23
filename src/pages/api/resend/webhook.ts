import { eq } from "drizzle-orm"
import { IncomingMessage } from "http"
import { buffer } from "micro"
import type { NextApiRequest, NextApiResponse } from "next"
import { Webhook, WebhookRequiredHeaders } from "svix"

import { db } from "@/lib/db"
import { config as envConfig } from "@/lib/util/config"
import { ResendWebhookEvent } from "@/types/resend"
import { receipts } from "db/schema"

export const config = {
  api: {
    bodyParser: false,
  },
}

export const webhook = new Webhook(envConfig.resendWebhookSecret)

type ExtractEvent<T extends `email.${string}`> = T extends `email.${infer U}` ? U : never
function getEventType<T extends `email.${string}`>(eventType: T): ExtractEvent<T> {
  return eventType.split(".")[1] as ExtractEvent<T>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`${req.method} request made to ${req.url}`)
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const payload = (await buffer(req)).toString()
    const headers = req.headers as IncomingMessage["headers"] & WebhookRequiredHeaders
    const event = webhook.verify(payload, headers) as ResendWebhookEvent

    const result = await db
      .update(receipts)
      .set({ emailStatus: getEventType(event.type) })
      .where(eq(receipts.id, event.data.email_id))
    if (result.rowsAffected !== 1) return res.status(404).end()
    return res.status(200).end()
  } catch (error) {
    return res.status(500).json(error)
  }
}
