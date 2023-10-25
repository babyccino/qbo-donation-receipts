import { Resend } from "resend"

import { config } from "@/lib/util/config"
import { EmailService } from "@/types/email"

export const resend = new Resend(config.resendApiKey)

export const resendEmailService: EmailService = {
  send: props => resend.emails.send(props),
}
