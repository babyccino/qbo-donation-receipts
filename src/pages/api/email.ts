import { ApiError } from "next/dist/server/api-utils"
import * as aws from "@aws-sdk/client-ses"
import { render } from "@react-email/render"
import nodemailer from "nodemailer"
import { renderToBuffer } from "@react-pdf/renderer"
import { z } from "zod"

import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { isUserDataComplete } from "@/lib/db-helper"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { WithBody, ReceiptPdfDocument } from "@/components/receipt"
import { user } from "@/lib/db"
import { getDonations } from "@/lib/qbo-api"
import { Donation } from "@/types/qbo-api"
import { getThisYear } from "@/lib/util/date"
import { downloadImagesForDonee } from "@/lib/db-helper"
import { config } from "@/lib/util/config"

const { testEmail } = config

const sesClient = new aws.SESClient({ apiVersion: "2010-12-01", region: "us-east-2" })
const transporter = nodemailer.createTransport({ SES: { ses: sesClient, aws } })

export const parser = z.object({
  emailBody: z.string().min(5),
})
export type DataType = z.infer<typeof parser>
const getFileNameFromImagePath = (str: string) => str.split("/")[1]

const handler: AuthorisedHandler = async (req, res, session) => {
  assertSessionIsQboConnected(session)

  const data = parseRequestBody(parser, req.body)
  const { emailBody } = data

  const doc = await user.doc(session.user.id).get()

  const dbUser = doc.data()
  if (!dbUser) throw new ApiError(401, "No user data found in database")
  if (!isUserDataComplete(dbUser)) throw new ApiError(401, "User data incomplete")

  const { donee, date } = dbUser

  const [donations, doneeWithImages] = await Promise.all([
    getDonations(session.accessToken, session.realmId, date, dbUser.items),
    downloadImagesForDonee(dbUser.donee),
  ])

  let counter = getThisYear()
  const { companyName } = donee
  const sendReceipt = async (entry: Donation) => {
    const recipient = testEmail ?? entry.email
    if (!recipient) return

    const props = {
      currency: "CAD",
      currentDate: new Date(),
      donation: entry,
      donationDate: date.endDate,
      donee: doneeWithImages,
      receiptNo: counter++,
    }
    const receiptBuffer = renderToBuffer(ReceiptPdfDocument(props))

    const signatureCid = "signature"
    const signatureAttachment = {
      filename: getFileNameFromImagePath(donee.signature as string),
      path: doneeWithImages.signature,
      cid: signatureCid,
    }
    const logoCid = "logo"
    const logoAttachment = {
      filename: getFileNameFromImagePath(donee.smallLogo as string),
      path: doneeWithImages.smallLogo,
      cid: logoCid,
    }
    const doneeWithCidImages = {
      ...donee,
      signature: `cid:${signatureCid}`,
      smallLogo: `cid:${logoCid}`,
    }
    const html = render(
      WithBody({
        ...props,
        donee: doneeWithCidImages,
        body: emailBody,
      })
    )

    await transporter.sendMail({
      from: { address: dbUser.email, name: companyName },
      to: recipient,
      subject: `Your ${getThisYear()} ${companyName} Donation Receipt`,
      attachments: [
        {
          filename: `Donation Receipt.pdf`,
          content: await receiptBuffer,
          contentType: "application/pdf",
        },
        signatureAttachment,
        logoAttachment,
      ],
      html,
    })
  }

  if (testEmail) {
    console.log(`sending test email to ${testEmail}`)
    await sendReceipt(donations[0])
    return res.status(200).json({ ok: true })
  }

  const receiptsSent = donations.filter(entry => entry.email !== null).map(sendReceipt)
  await Promise.all(receiptsSent)

  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
