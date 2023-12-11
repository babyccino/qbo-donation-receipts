import { createId } from "@paralleldrive/cuid2"
import { renderToBuffer } from "@react-pdf/renderer"
import makeChecksum from "checksum"
import { and, eq, gt, inArray, sql } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { WithBody } from "@/components/receipt/email"
import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { refreshTokenIfStale } from "@/lib/auth/next-auth-helper-server"
import { bufferToPngDataUrl, downloadImageAsDataUrl } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
import { db } from "@/lib/db"
import { formatEmailBody } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import resend from "@/lib/resend"
import { isUserSubscribed } from "@/lib/stripe"
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

const DAY_LENGTH_MS = 1000 * 60 * 60 * 24

export const parser = z.object({
  emailBody: z.string(),
  recipientIds: z.array(z.string()).refine(arr => arr.length > 0),
  checksum: z.string(),
})
export type EmailDataType = z.input<typeof parser>

type DonationWithEmail = Donation & { email: string }
const hasEmail = (donation: Donation): donation is DonationWithEmail => Boolean(donation.email)

const handler: AuthorisedHandler = async (req, res, session) => {
  if (!session.accountId) throw new ApiError(401, "user not connected")
  const userId = session.user.id
  const { emailBody, recipientIds, checksum } = parseRequestBody(parser, req.body)

  const [row] = await Promise.all([
    db.query.accounts
      .findFirst({
        // if the realmId is specified get that account otherwise just get the first account for the user
        where: eq(accounts.id, session.accountId),
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
          user: {
            columns: { email: true },
            with: { subscription: { columns: { status: true, currentPeriodEnd: true } } },
          },
        },
      })
      .then(row => {
        if (!row) throw new ApiError(500, "user not found in db")
        const { doneeInfo, userData, user, ...account } = row
        if (!account || account.scope !== "accounting" || !account.accessToken || !account.realmId)
          throw new ApiError(401, "client not qbo-connected")

        if (!doneeInfo || !userData) throw new ApiError(400, "data missing")

        const { subscription } = user
        if (!subscription || !isUserSubscribed(subscription))
          throw new ApiError(401, "not subscribed")
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
          eq(emailHistories.accountId, session.accountId),
          gt(emailHistories.createdAt, new Date(Date.now() - DAY_LENGTH_MS)),
        ),
      )
      .then(([value]) => {
        if (value.count > 5) throw new ApiError(429, "too many requests")
      }),
  ])

  const { account, doneeInfo, userData, email } = row
  const realmId = account.realmId as string

  await refreshTokenIfStale(account)

  const [donations, signatureWebpDataUrl, logoWebpDataUrl] = await Promise.all([
    getDonations(
      account.accessToken as string,
      realmId,
      { startDate: userData.startDate, endDate: userData.endDate },
      userData.items ? userData.items.split(",") : [],
    ),
    downloadImageAsDataUrl(storageBucket, doneeInfo.signature),
    downloadImageAsDataUrl(storageBucket, doneeInfo.smallLogo),
  ])

  if (makeChecksum(JSON.stringify(donations)) !== checksum)
    throw new ApiError(400, "checksum mismatch")

  // throw if req.body.to is not a subset of the calculated donations
  {
    const set = new Set(donations.map(entry => entry.donorId))
    const ids = recipientIds.filter(id => !set.has(id))
    if (ids.length > 0)
      throw new ApiError(
        500,
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
  let counter = (counterRows[0]?.count ?? 0) + 1
  const thisYear = getThisYear()

  const emailHistoryId = createId()
  const receiptsToSend: DonationWithEmail[] = []
  const receiptsNotSent: string[] = []
  for (const donation of donations) {
    if (hasEmail(donation) && recipientIds.includes(donation.donorId)) receiptsToSend.push(donation)
    else receiptsNotSent.push(donation.donorId)
  }

  if (receiptsToSend.length === 0) throw new ApiError(500, "No receipts were sent")

  // it's very important that only donations which have been successfully recorded are sent
  // if there is any error recording the donations we will not send out any receipts
  const insertSuccess = await db.transaction(async tx => {
    const inserts = await Promise.all(
      receiptsToSend.map(donation =>
        tx.insert(donationsSchema).values({
          id: createId(),
          donorId: donation.donorId,
          email,
          emailHistoryId,
          name: donation.name,
          total: donation.total,
        }),
      ),
    )
    if (!inserts.every(val => val.rowsAffected > 0)) {
      await tx.rollback()
      return false
    } else return true
  })

  if (!insertSuccess)
    throw new ApiError(500, "there was an error recording donations in the database")

  const sendReceipt = async (entry: DonationWithEmail) => {
    try {
      const receiptNo = thisYear + counter * 10000
      counter += 1
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
    } catch (e) {
      return { donorId: entry.donorId, success: false }
    }
    return { donorId: entry.donorId, success: true }
  }

  const receiptsSent = await Promise.all(receiptsToSend.map(sendReceipt))
  const receiptsSentSuccesses: string[] = []
  const receiptsSentFailures: string[] = []
  for (const { success, donorId } of receiptsSent) {
    if (success) receiptsSentSuccesses.push(donorId)
    else receiptsSentFailures.push(donorId)
  }
  await Promise.all([
    receiptsSentFailures.length &&
      db
        .delete(donationsSchema)
        .where(
          and(
            inArray(donationsSchema.donorId, receiptsSentFailures),
            eq(donationsSchema.emailHistoryId, emailHistoryId),
          ),
        ),
    db.insert(emailHistories).values({
      id: emailHistoryId,
      endDate: userData.endDate,
      startDate: userData.startDate,
      accountId: account.id,
    }),
  ])
  return res.status(200).json({
    sent: true,
    failures: receiptsSentFailures,
    successes: receiptsSentSuccesses,
    notSent: receiptsNotSent,
  })
}

export default createAuthorisedHandler(handler, ["POST"])
