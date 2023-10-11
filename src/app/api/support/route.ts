import * as aws from "@aws-sdk/client-ses"
import { NextApiHandler } from "next"
import nodemailer from "nodemailer"
import { z } from "zod"

import { parseRequestBody } from "@/lib/util/request-server"
import { NextResponse } from "next/server"

const sesClient = new aws.SESClient({ apiVersion: "2010-12-01", region: "us-east-2" })
const transporter = nodemailer.createTransport({ SES: { ses: sesClient, aws } })

export const parser = z.object({
  from: z.string().email(),
  subject: z.string().min(5),
  body: z.string().min(5),
})
export type DataType = z.infer<typeof parser>

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).end()
  }

  try {
    const data = parseRequestBody(parser, req.body)

    await transporter.sendMail({
      from: "contact@donationreceipt.online",
      to: "gus.ryan163@gmail.com",
      subject: `A user submitted a support ticket: ${data.subject}`,
      text: data.body,
      replyTo: data.from,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error(error)

    return NextResponse.json(error, { status: 500 })
  }
}
export default handler
