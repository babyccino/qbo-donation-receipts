import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { and, eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { parseRequestBody } from "@/lib/util/request-server"
import { Donation } from "@/types/qbo-api"

import { WithBody } from "@/components/receipt/email"
import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { db } from "@/lib/db"
import { bufferToPngDataUrl, downloadImageAsDataUrl } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
import { formatEmailBody } from "@/lib/email"
import resend from "@/lib/resend"
import { config } from "@/lib/util/config"
import { getDonationRange, getThisYear } from "@/lib/util/date"
import { wait } from "@/lib/util/etc"
import { dataUrlToBase64 } from "@/lib/util/image-helper"
import { renderToBuffer } from "@react-pdf/renderer"
import { receipts } from "db/schema"

export const parser = z.object({
  emailBody: z.string(),
  campaignId: z.string(),
  email: z.string(),
  doneeInfo: z.object({
    companyName: z.string(),
    signature: z.string(),
    smallLogo: z.string(),
    country: z.string(),
    companyAddress: z.string(),
    registrationNumber: z.string(),
    signatoryName: z.string(),
    largeLogo: z.string(),
  }),
  userData: z.object({
    items: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
  donations: z.array(
    z.object({
      name: z.string(),
      donorId: z.string(),
      total: z.number(),
      items: z.array(z.object({ name: z.string(), id: z.string(), total: z.number() })),
      address: z.string(),
      email: z.string(),
    }),
  ),
  counter: z.number(),
})
export type EmailWorkerDataType = z.input<typeof parser>

export async function sendReceipts(props: EmailWorkerDataType) {
  const { emailBody, email, campaignId, doneeInfo, userData, donations, counter } = props

  const [[signatureWebpDataUrl, signaturePngDataUrl], [logoWebpDataUrl, logoPngDataUrl]] =
    await Promise.all([
      (async () => {
        const signatureWebpDataUrl = await downloadImageAsDataUrl(
          storageBucket,
          doneeInfo.signature,
        )
        const signaturePngDataUrl = await bufferToPngDataUrl(
          Buffer.from(dataUrlToBase64(signatureWebpDataUrl), "base64"),
        )
        return [signatureWebpDataUrl, signaturePngDataUrl]
      })(),
      (async () => {
        const logoWebpDataUrl = await downloadImageAsDataUrl(storageBucket, doneeInfo.smallLogo)
        const logoPngDataUrl = await bufferToPngDataUrl(
          Buffer.from(dataUrlToBase64(logoWebpDataUrl), "base64"),
        )
        return [logoWebpDataUrl, logoPngDataUrl]
      })(),
    ])

  const doneeWithPngDataUrls: typeof doneeInfo = {
    ...doneeInfo,
    signature: signaturePngDataUrl,
    smallLogo: logoPngDataUrl,
  }

  const doneeWithWebpDataUrls: typeof doneeInfo = {
    ...doneeInfo,
    signature: signatureWebpDataUrl,
    smallLogo: logoWebpDataUrl,
  }

  const { companyName } = doneeInfo

  type ResendProps = {
    from: string
    to: string
    reply_to: string
    subject: string
    attachments: { filename: string; content: Buffer }[]
    react: JSX.Element
  }

  let newCounter = counter
  const donationRange = getDonationRange(userData.startDate, userData.endDate)
  async function getBatchResendProps(entries: DonationWithEmail[]) {
    const receiptsSentFailures: string[] = []
    const receiptsSentSuccesses: { donation: DonationWithEmail; send: ResendProps }[] = []
    await Promise.all(
      entries.map(async entry => {
        try {
          newCounter += 1
          const props = {
            currency: "CAD",
            currentDate: new Date(),
            donation: entry,
            donationDate: donationRange,
            donee: doneeWithPngDataUrls,
            receiptNo: newCounter,
          }

          const body = formatEmailBody(emailBody, entry.name)
          const receiptBuffer = await renderToBuffer(ReceiptPdfDocument(props))
          const resendProps = {
            from: `${companyName} <noreply@${config.domain}>`,
            to: entry.email,
            reply_to: email,
            subject: `Your ${getThisYear()} ${companyName} Donation Receipt`,
            attachments: [
              {
                filename: `${entry.name} Donations ${donationRange}.pdf`,
                content: receiptBuffer,
              },
            ],
            react: WithBody({
              ...props,
              donee: doneeWithWebpDataUrls,
              body,
            }),
          }
          receiptsSentSuccesses.push({ donation: entry, send: resendProps })
        } catch (e) {
          receiptsSentFailures.push(entry.donorId)
        }
      }),
    )
    return { receiptsSentFailures, receiptsSentSuccesses }
  }

  let timer = null
  const dbInserts: Promise<any>[] = []
  // batch the receipts to send in groups of maximum 100 receipts
  while (donations.length > 0) {
    const batch = donations.splice(0, 100)
    const { receiptsSentSuccesses } = await getBatchResendProps(batch)

    // send the emails in the batch
    // wait 1 second between each batch to avoid rate limiting
    await timer
    const resendRes = await resend.batch.send(receiptsSentSuccesses.map(entry => entry.send))
    timer = wait(1000)

    const data = resendRes.data?.data ?? []
    for (let i = 0; i < (data.length as number); i++) {
      const emailId = data[i].id
      dbInserts.push(
        db
          .update(receipts)
          .set({
            emailStatus: "sent",
            emailId,
          })
          .where(
            and(
              eq(receipts.campaignId, campaignId),
              eq(receipts.donorId, receiptsSentSuccesses[i].donation.donorId),
            ),
          )
          .run(),
      )
    }
  }

  await Promise.all(dbInserts)
}

type DonationWithEmail = Donation & { email: string }

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  if (!event.body) return { statusCode: 400, body: JSON.stringify({ message: "no body" }) }

  try {
    const body = parseRequestBody(parser, JSON.parse(event.body))
    await sendReceipts(body)

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    }
  } catch (err: any) {
    console.error(err)
    if (err instanceof ApiError) {
      return {
        statusCode: err.statusCode,
        body: JSON.stringify({
          message: err.message,
        }),
      }
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err.message ?? "an unexpected server error occurred",
      }),
    }
  }
}
