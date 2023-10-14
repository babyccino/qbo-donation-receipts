import { NextApiHandler } from "next"
import { z } from "zod"

import { resend } from "@/lib/email"
import { parseRequestBody } from "@/lib/util/request-server"

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

    await resend.emails.send({
    from: "contact@donationreceipt.online",
      to: "gus.ryan163@gmail.com",
      subject: `A user submitted a support ticket: ${data.subject}`,
      text: data.body,
      reply_to: data.from,
    })

    res.status(200).json({ ok: true })
  } catch (error) {
    console.error(error)

    res.status(500).json(error)
  }
}
export default handler
