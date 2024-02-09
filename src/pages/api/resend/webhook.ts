import type { NextApiRequest, NextApiResponse } from "next"

type ResendWebhookPayload =
  | {
      type:
        | "email.sent"
        | "email.delivered"
        | "email.delivery_delayed"
        | "email.complained"
        | "email.bounced"
        | "email.opened"
      created_at: string
      data: {
        created_at: string
        email_id: string
        from: string
        to: string[]
        subject: string
      }
    }
  | {
      type: "email.clicked"
      created_at: string
      data: {
        created_at: string
        email_id: string
        from: string
        to: string[]
        click: {
          ipAddress: string
          link: string
          timestamp: string
          userAgent: string
        }
        subject: string
      }
    }

export default (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") res.status(405).end()

  const payload = req.body
  console.log(payload)
  res.status(200)
}
