export type ResendWebhookEvent =
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
export type EmailStatus =
  | "not_sent"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "complained"
  | "bounced"
  | "opened"
  | "clicked"
