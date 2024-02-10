import { createId } from "@paralleldrive/cuid2"
import { renderToBuffer } from "@react-pdf/renderer"
import makeChecksum from "checksum"
import { and, eq, gt, sql } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { Resend } from "resend"
import { z } from "zod"

import { WithBody } from "@/components/receipt/email"
import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { bufferToPngDataUrl, downloadImageAsDataUrl } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
import { formatEmailBody } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import resend from "@/lib/resend"
import { isUserSubscribed } from "@/lib/stripe"
import { config } from "@/lib/util/config"
import { getDonationRange, getThisYear } from "@/lib/util/date"
import { wait } from "@/lib/util/etc"
import { dataUrlToBase64 } from "@/lib/util/image-helper"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { Donation } from "@/types/qbo-api"
import { accounts, campaigns, receipts } from "db/schema"

const DAY_LENGTH_MS = 1000 * 60 * 60 * 24

export const parser = z.object({
  emailBody: z.string(),
  recipientIds: z.array(z.string()).refine(arr => arr.length > 0),
  checksum: z.string(),
})
export type EmailDataType = z.input<typeof parser>

type DonationWithEmail = Donation & { email: string }
const hasEmail = (donation: Donation): donation is DonationWithEmail => Boolean(donation.email)

export const createEmailHandler =
  (resend: Resend): AuthorisedHandler =>
  async (req, res, session) => {
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
          if (
            !account ||
            account.scope !== "accounting" ||
            !account.accessToken ||
            !account.realmId
          )
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
        .from(campaigns)
        .where(
          and(
            eq(campaigns.accountId, session.accountId),
            gt(campaigns.createdAt, new Date(Date.now() - DAY_LENGTH_MS)),
          ),
        )
        .then(([value]) => {
          if (value.count > 5) throw new ApiError(429, "too many requests")
        }),
    ])

    const { account, doneeInfo, userData, email } = row
    const realmId = account.realmId as string

    await refreshTokenIfNeeded(account)

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
        .from(campaigns)
        .where(and(eq(campaigns.accountId, userId))),
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

    type ResendProps = {
      emailId?: string
      from: string
      to: string
      reply_to: string
      subject: string
      attachments: { filename: string; content: Buffer }[]
      react: JSX.Element
    }

    const sendableReceipts: DonationWithEmail[] = []
    const receiptsNotSent: string[] = []
    for (const donation of donations) {
      if (hasEmail(donation) && recipientIds.includes(donation.donorId))
        sendableReceipts.push(donation)
      else receiptsNotSent.push(donation.donorId)
    }

    if (sendableReceipts.length === 0) throw new ApiError(500, "No receipts were sent")

    const receiptsSentFailures: DonationWithEmail[] = []
    const receiptsSentSuccesses: (DonationWithEmail & { send: ResendProps })[] = []
    const donationRange = getDonationRange(userData.startDate, userData.endDate)
    async function getResendProps(entry: DonationWithEmail): Promise<void> {
      try {
        const receiptNo = thisYear + counter * 10000
        counter += 1
        const props = {
          currency: "CAD",
          currentDate: new Date(),
          donation: entry,
          donationDate: donationRange,
          donee: doneeWithPngDataUrls,
          receiptNo,
        }

        const body = formatEmailBody(emailBody, entry.name)
        const receiptBuffer = await renderToBuffer(ReceiptPdfDocument(props))
        const entryWithSend = entry as DonationWithEmail & { send: ResendProps }
        entryWithSend.send = {
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
        receiptsSentSuccesses.push(entryWithSend)
      } catch (e) {
        receiptsSentFailures.push(entry)
      }
    }
    let timer = Promise.resolve()
    // batch the receipts to send in groups of maximum 100 receipts
    while (sendableReceipts.length > 0) {
      const batch = sendableReceipts.splice(0, 100)
      await Promise.all(batch.map(getResendProps))
      // send the emails in the batch
      // wait 1 second between each batch to avoid rate limiting
      await timer
      const resendRes = await resend.batch.send(receiptsSentSuccesses.map(entry => entry.send))
      const data = resendRes.data?.data ?? []
      for (let i = 0; i < (data.length as number); i++) {
        const id = data[i].id
        receiptsSentSuccesses[i].send.emailId = id
      }
      timer = wait(1000)
    }

    const campaignId = createId()
    const ops = [
      db.insert(campaigns).values({
        id: campaignId,
        endDate: userData.endDate,
        startDate: userData.startDate,
        accountId: account.id,
      }),
      ...receiptsSentSuccesses.map(entry =>
        db.insert(receipts).values({
          id: entry.send.emailId as string,
          emailStatus: "sent",
          campaignId,
          donorId: entry.donorId,
          email: entry.email,
          name: entry.name,
          total: entry.total,
        }),
      ),
      ...receiptsSentFailures.map(entry =>
        db.insert(receipts).values({
          id: createId() as string,
          emailStatus: "not_sent",
          campaignId,
          donorId: entry.donorId,
          email: entry.email,
          name: entry.name,
          total: entry.total,
        }),
      ),
    ] as const
    const results = await db.batch(ops)
    return res.status(200).json({
      campaignId,
    })
  }

export default createAuthorisedHandler(createEmailHandler(resend), ["POST"])
