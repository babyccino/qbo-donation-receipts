import * as aws from "@aws-sdk/client-ses"
import nodemailer from "nodemailer"
import { z } from "zod"

import { parseRequestBody } from "@/lib/util/request-server"
import { redirect } from "next/navigation"

const sesClient = new aws.SESClient({ apiVersion: "2010-12-01", region: "us-east-2" })
const transporter = nodemailer.createTransport({ SES: { ses: sesClient, aws } })

const parser = z.object({
  from: z.string().email(),
  subject: z.string().min(5),
  body: z.string().min(5),
})
export type DataType = z.infer<typeof parser>

export async function supportRequest(formData: FormData) {
  "use server"

  const from = formData.get("from") as string
  const subject = formData.get("subject") as string
  const body = formData.get("body") as string

  const data = parseRequestBody(parser, { from, subject, body })

  await transporter.sendMail({
    from: "contact@donationreceipt.online",
    to: "gus.ryan163@gmail.com",
    subject: `A user submitted a support ticket: ${data.subject}`,
    text: data.body,
    replyTo: data.from,
  })

  redirect("/support?sent=true")
}
