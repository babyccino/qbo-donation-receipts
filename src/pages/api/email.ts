import { createId } from "@paralleldrive/cuid2"
import { renderToBuffer } from "@react-pdf/renderer"
import { and, eq, gt, sql } from "drizzle-orm"
import { Awaitable } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { WithBody } from "@/components/receipt/email"
import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { storageBucket } from "@/lib/db"
import { bufferToPngDataUrl, downloadImageAsDataUrl } from "@/lib/db-helper"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { formatEmailBody } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import resend from "@/lib/resend"
import { config } from "@/lib/util/config"
import { formatDateHtmlReverse, getThisYear } from "@/lib/util/date"
import { dataUrlToBase64 } from "@/lib/util/image-helper"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { Donation } from "@/types/qbo-api"
import { accounts, donations as donationsSchema, emailHistories } from "db/schema"

const { testEmail } = config

const DAY_LENGTH_MS = 1000 * 60 * 60 * 24

export const parser = z.object({
  emailBody: z.string(),
  recipientIds: z.array(z.string()).refine(arr => arr.length > 0),
  realmId: z.string(),
})
export type EmailDataType = z.input<typeof parser>

type DonationWithEmail = Donation & { email: string }
const hasEmail = (donation: Donation): donation is DonationWithEmail => Boolean(donation.email)

const handler: AuthorisedHandler = async (req, res, session) => {
  const userId = session.user.id
  const { emailBody, recipientIds, realmId } = parseRequestBody(parser, req.body)

  const [row] = await Promise.all([
    db.query.accounts
      .findFirst({
        // if the realmId is specified get that account otherwise just get the first account for the user
        where: and(eq(accounts.realmId, realmId), eq(accounts.userId, session.user.id)),
        columns: {
          id: true,
          accessToken: true,
          scope: true,
          realmId: true,
          createdAt: true,
          expiresAt: true,
          refreshToken: true,
          refreshTokenExpiresAt: true,
        },
        with: {
          doneeInfo: {
            columns: { accountId: false, createdAt: false, id: false, updatedAt: false },
          },
          userData: { columns: { items: true, startDate: true, endDate: true } },
          user: { columns: { email: true } },
        },
      })
      .then(row => {
        if (!row) throw new ApiError(500, "user not found in db")
        const { doneeInfo, userData, user, ...account } = row
        if (!account || account.scope !== "accounting" || !account.accessToken)
          throw new ApiError(401, "client not qbo-connected")

        if (!doneeInfo || !userData) throw new ApiError(400, "Data missing from user")

        // if (!isUserSubscribed(userData)) throw new ApiError(401, "User not subscribed")
        if (userData.items === null) throw new ApiError(400, "no items selected")
        return {
          account,
          doneeInfo,
          userData: userData as { items: string; startDate: Date; endDate: Date },
          email: user.email,
        }
      }),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(emailHistories)
      .where(
        and(
          eq(emailHistories.accountId, userId),
          gt(emailHistories.createdAt, new Date(Date.now() - DAY_LENGTH_MS)),
        ),
      )
      .then(([value]) => {
        if (value.count > 5) throw new ApiError(429, "too many requests")
      }),
  ])

  const { account, doneeInfo, userData, email } = row

  await refreshTokenIfNeeded(account)

  const [donations, signatureWebpDataUrl, logoWebpDataUrl] = await Promise.all([
    getDonations(
      account.accessToken as string,
      realmId,
      { startDate: userData.startDate, endDate: userData.endDate },
      userData.items.split(","),
    ),
    downloadImageAsDataUrl(storageBucket, doneeInfo.signature),
    downloadImageAsDataUrl(storageBucket, doneeInfo.smallLogo),
  ])

  // throw if req.body.to is not a subset of the calculated donations
  {
    const set = new Set(donations.map(entry => entry.donorId))
    const ids = recipientIds.filter(id => !set.has(id))
    if (ids.length > 0)
      throw new ApiError(
        400,
        `${ids.length} IDs were found in the request body which were not present in the calculated donations for this date range` +
          ids,
      )
  }

  const [signaturePngDataUrl, logoPngDataUrl, counterRows] = await Promise.all([
    bufferToPngDataUrl(Buffer.from(dataUrlToBase64(signatureWebpDataUrl), "base64")),
    bufferToPngDataUrl(Buffer.from(dataUrlToBase64(logoWebpDataUrl), "base64")),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(emailHistories)
      .where(and(eq(emailHistories.accountId, userId))),
  ])
  const counter = counterRows[0]?.count || 0

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
  const thisYear = getThisYear()
  const sendReceipt = async (entry: DonationWithEmail) => {
    const receiptNo = thisYear + counter * 10000
    const props = {
      currency: "CAD",
      currentDate: new Date(),
      donation: entry,
      donationDate: userData.endDate,
      donee: doneeWithPngDataUrls,
      receiptNo,
    }
    const receiptBuffer = renderToBuffer(ReceiptPdfDocument(props))

    const body = formatEmailBody(emailBody, entry.name)

    await resend.emails.send({
      from: `${companyName} <noreply@${config.domain}>`,
      to: entry.email,
      reply_to: email,
      subject: `Your ${getThisYear()} ${companyName} Donation Receipt`,
      attachments: [
        {
          filename: `${entry.name} Donations ${formatDateHtmlReverse(
            userData.endDate,
          )} - ${formatDateHtmlReverse(userData.startDate)}.pdf`,
          content: await receiptBuffer,
        },
      ],
      react: WithBody({
        ...props,
        donee: doneeWithWebpDataUrls,
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
  const notSentData: { name: string; donorId: string }[] = []
  for (const donation of donations) {
    if (hasEmail(donation) && recipientIds.includes(donation.donorId))
      receiptsSentPromises.push(testEmail ? Promise.resolve(donation) : sendReceipt(donation))
    else notSentData.push({ donorId: donation.donorId, name: donation.name })
  }

  if (receiptsSentPromises.length === 0) throw new ApiError(500, "No receipts were sent")

  const receiptsSent = await Promise.all(receiptsSentPromises)

  const emailHistoryId = createId()
  const insertPromises: Awaitable<any> = receiptsSent.map(donation => {
    db.insert(donationsSchema).values({
      id: createId(),
      donorId: donation.donorId,
      email,
      emailHistoryId,
      name: donation.name,
      total: donation.total,
    })
  })
  insertPromises.push(
    db.insert(emailHistories).values({
      id: emailHistoryId,
      endDate: userData.endDate,
      startDate: userData.startDate,
      accountId: account.id,
    }),
  )
  await Promise.all(insertPromises)
  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
