import { ApiError } from "next/dist/server/api-utils"
import * as aws from "@aws-sdk/client-ses"
import { FieldValue } from "@google-cloud/firestore"
import { render } from "@react-email/render"
import nodemailer from "nodemailer"
import { renderToBuffer } from "@react-pdf/renderer"
import { z } from "zod"

import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { getThisYear } from "@/lib/util/date"
import { isUserDataComplete, downloadImagesForDonee } from "@/lib/db-helper"
import { config } from "@/lib/util/config"
import { getUserData, storageBucket, user } from "@/lib/db"
import { getDonations } from "@/lib/qbo-api"
import { formatEmailBody } from "@/lib/email"
import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { WithBody } from "@/components/receipt/email"
import { Donation } from "@/types/qbo-api"
import { EmailHistoryItem } from "@/types/db"
import { isUserSubscribed } from "@/lib/stripe"
import { NextResponse } from "next/server"

const { testEmail } = config

const sesClient = new aws.SESClient({ apiVersion: "2010-12-01", region: "us-east-2" })
const transporter = nodemailer.createTransport({ SES: { ses: sesClient, aws } })

const getFileNameFromImagePath = (str: string) => str.split("/")[1]

const parser = z.object({
  emailBody: z.string().min(5),
  recipientIds: z.array(z.number()).refine(arr => arr.length > 0),
})
export type EmailDataType = z.input<typeof parser>

type DonationWithEmail = Donation & { email: string }
const hasEmail = (donation: Donation): donation is DonationWithEmail => Boolean(donation.email)

const handler: AuthorisedHandler = async (req, session) => {
  assertSessionIsQboConnected(session)

  const { emailBody, recipientIds } = parseRequestBody(parser, req.body)

  const userData = await getUserData(session.user.id)
  if (!isUserDataComplete(userData)) throw new ApiError(401, "User data incomplete")
  if (!isUserSubscribed(userData)) throw new ApiError(401, "User not subscribed")

  const { donee, dateRange } = userData

  const [donations, doneeWithImages] = await Promise.all([
    getDonations(session.accessToken, session.realmId, dateRange, userData.items),
    downloadImagesForDonee(userData.donee, storageBucket),
  ])

  // throw if req.body.to is not a subset of the calculated donations
  const set = new Set(donations.map(entry => entry.id))
  const ids = recipientIds.filter(id => !set.has(id))
  if (ids.length > 0)
    throw new ApiError(
      400,
      `${ids.length} IDs were found in the request body which were not present in the calculated donations for this date range` +
        ids,
    )

  let counter = getThisYear()
  const { companyName } = donee
  const sendReceipt = async (entry: DonationWithEmail) => {
    const props = {
      currency: "CAD",
      currentDate: new Date(),
      donation: entry,
      donationDate: dateRange.endDate,
      donee: doneeWithImages,
      receiptNo: counter++,
    }
    const receiptBuffer = renderToBuffer(ReceiptPdfDocument(props))

    const body = formatEmailBody(emailBody, entry.name)

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
        body,
      }),
    )

    await transporter.sendMail({
      from: { address: userData.email, name: companyName },
      to: entry.email,
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

    return entry
  }

  if (testEmail) {
    console.log(`sending test email to ${testEmail}`)
    const testDonation = { ...donations[0], email: testEmail }
    await sendReceipt(testDonation)
  }

  const receiptsSentPromises: Promise<DonationWithEmail>[] = []
  const notSentData: { name: string; id: number }[] = []
  for (const donation of donations) {
    if (hasEmail(donation) && recipientIds.includes(donation.id))
      receiptsSentPromises.push(testEmail ? Promise.resolve(donation) : sendReceipt(donation))
    else notSentData.push({ id: donation.id, name: donation.name })
  }

  if (receiptsSentPromises.length === 0) throw new ApiError(500, "No receipts were sent")

  const receiptsSent = await Promise.all(receiptsSentPromises)

  const doc = user.doc(session.user.id)
  const emailHistoryItem: EmailHistoryItem = {
    dateRange: dateRange,
    timeStamp: new Date(),
    donations: receiptsSent,
    notSent: notSentData,
  }
  await doc.update({
    emailHistory: FieldValue.arrayUnion(emailHistoryItem),
  })
  return NextResponse.json({ ok: true }, { status: 200 })
}

export const POST = createAuthorisedHandler(handler)
