import { FieldValue } from "@google-cloud/firestore"
import { renderToBuffer } from "@react-pdf/renderer"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { WithBody } from "@/components/receipt/email"
import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { getUserData, storageBucket, user } from "@/lib/db"
import { bufferToPngDataUrl, downloadImageAsDataUrl, isUserDataComplete } from "@/lib/db-helper"
import { formatEmailBody } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import resend from "@/lib/resend"
import { isUserSubscribed } from "@/lib/stripe"
import { config } from "@/lib/util/config"
import { formatDateHtmlReverse, getThisYear } from "@/lib/util/date"
import { dataUrlToBase64 } from "@/lib/util/image-helper"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { EmailHistoryItem } from "@/types/db"
import { Donation } from "@/types/qbo-api"

const { testEmail } = config

export const parser = z.object({
  emailBody: z.string(),
  recipientIds: z.array(z.number()).refine(arr => arr.length > 0),
})
export type EmailDataType = z.input<typeof parser>

type DonationWithEmail = Donation & { email: string }
const hasEmail = (donation: Donation): donation is DonationWithEmail => Boolean(donation.email)

const handler: AuthorisedHandler = async (req, res, session) => {
  assertSessionIsQboConnected(session)

  const { emailBody, recipientIds } = parseRequestBody(parser, req.body)

  const userData = await getUserData(session.user.id)
  if (!isUserDataComplete(userData)) throw new ApiError(401, "User data incomplete")
  if (!isUserSubscribed(userData)) throw new ApiError(401, "User not subscribed")

  const { donee, dateRange, emailHistory } = userData

  if (emailHistory && emailHistory.length >= 4) {
    const now = new Date().getTime()
    const msInDay = 1000 * 60 * 60 * 24
    let count = 0
    for (const item of emailHistory) {
      if (now - item.timeStamp.getTime() < msInDay) ++count
      if (count >= 4) throw new ApiError(429, "too many requests")
    }
  }

  const [donations, signatureWebpDataUrl, logoWebpDataUrl] = await Promise.all([
    getDonations(session.accessToken, session.realmId, dateRange, userData.items),
    downloadImageAsDataUrl(storageBucket, donee.signature),
    downloadImageAsDataUrl(storageBucket, donee.smallLogo),
  ])

  // throw if req.body.to is not a subset of the calculated donations
  {
    const set = new Set(donations.map(entry => entry.id))
    const ids = recipientIds.filter(id => !set.has(id))
    if (ids.length > 0)
      throw new ApiError(
        400,
        `${ids.length} IDs were found in the request body which were not present in the calculated donations for this date range` +
          ids,
      )
  }

  const [signaturePngDataUrl, logoPngDataUrl] = await Promise.all([
    bufferToPngDataUrl(Buffer.from(dataUrlToBase64(signatureWebpDataUrl), "base64")),
    bufferToPngDataUrl(Buffer.from(dataUrlToBase64(logoWebpDataUrl), "base64")),
  ])

  const doneeWithPngDataUrls = {
    ...donee,
    signatue: signaturePngDataUrl,
    smallLogo: logoPngDataUrl,
  }

  let counter = emailHistory?.flatMap(item => item.donations).length || 0
  const { companyName } = donee
  const thisYear = getThisYear()
  const sendReceipt = async (entry: DonationWithEmail) => {
    const receiptNo = thisYear + counter * 10000
    const props = {
      currency: "CAD",
      currentDate: new Date(),
      donation: entry,
      donationDate: dateRange.endDate,
      donee: doneeWithPngDataUrls,
      receiptNo,
    }
    const receiptBuffer = renderToBuffer(ReceiptPdfDocument(props))

    const body = formatEmailBody(emailBody, entry.name)

    const doneeWithWebpDataUrlImages = {
      ...donee,
      signature: signatureWebpDataUrl,
      smallLogo: logoWebpDataUrl,
    }

    await resend.emails.send({
      from: `${companyName} <noreply@${config.domain}>`,
      to: entry.email,
      reply_to: userData.email,
      subject: `Your ${getThisYear()} ${companyName} Donation Receipt`,
      attachments: [
        {
          filename: `${entry.name} Donations ${formatDateHtmlReverse(
            dateRange.endDate,
          )} - ${formatDateHtmlReverse(dateRange.startDate)}.pdf`,
          content: await receiptBuffer,
        },
      ],
      react: WithBody({
        ...props,
        donee: doneeWithWebpDataUrlImages,
        body,
      }),
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
  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
