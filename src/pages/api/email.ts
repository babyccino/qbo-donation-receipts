import { renderToBuffer } from "@react-pdf/renderer"
import { and, eq, gt, or, sql } from "drizzle-orm"
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
import { createId } from "@paralleldrive/cuid2"
import {
  accounts,
  doneeInfos,
  emailHistories,
  userDatas,
  users,
  donations as donationsSchema,
} from "db/schema"
import { Awaitable } from "next-auth"

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
  if (typeof realmId !== "string") throw new ApiError(500, "realmid not provided")

  const [row] = await Promise.all([
    db
      .select({
        userData: {
          items: userDatas.items,
          startDate: userDatas.startDate,
          endDate: userDatas.endDate,
        },
        doneeInfo: doneeInfos,
        account: {
          id: accounts.id,
          accessToken: accounts.accessToken,
          realmId: accounts.realmId,
          createdAt: accounts.createdAt,
          expiresAt: accounts.expiresAt,
          refreshToken: accounts.refreshToken,
          refreshTokenExpiresAt: accounts.refreshTokenExpiresAt,
          scope: accounts.scope,
        },
        email: users.email,
      })
      .from(doneeInfos)
      .fullJoin(
        userDatas,
        and(eq(doneeInfos.realmId, userDatas.realmId), eq(doneeInfos.userId, userDatas.userId)),
      )
      .fullJoin(
        accounts,
        or(
          and(eq(accounts.realmId, doneeInfos.realmId), eq(accounts.userId, doneeInfos.userId)),
          and(eq(accounts.realmId, userDatas.realmId), eq(accounts.userId, userDatas.userId)),
        ),
      )
      .rightJoin(
        users,
        or(eq(users.id, doneeInfos.id), eq(users.id, userDatas.id), eq(users.id, accounts.userId)),
      )
      .where(and(eq(users.id, userId), eq(accounts.realmId, realmId)))
      .limit(1)
      .then(rows => {
        const row = rows.at(0)
        if (!row) throw new ApiError(500, "user not found in db")
        const { account, doneeInfo, userData } = row
        if (!account || account.scope !== "accounting" || !account.accessToken)
          throw new ApiError(401, "client not qbo-connected")

        if (!doneeInfo || !userData) throw new ApiError(400, "Data missing from user")

        // if (!isUserSubscribed(userData)) throw new ApiError(401, "User not subscribed")
        if (userData.items === null) throw new ApiError(400, "no items selected")
        return {
          account,
          doneeInfo,
          userData: userData as { items: string; startDate: Date; endDate: Date },
          email: row.email,
        }
      }),
    db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(emailHistories)
      .where(
        and(
          eq(emailHistories.userId, userId),
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
      account.accessToken,
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
      .where(and(eq(emailHistories.userId, userId))),
  ])
  const counter = counterRows[0]?.count || 0

  const doneeWithPngDataUrls = {
    ...doneeInfo,
    signatue: signaturePngDataUrl,
    smallLogo: logoPngDataUrl,
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

    const doneeWithWebpDataUrlImages = {
      ...doneeInfo,
      signature: signatureWebpDataUrl,
      smallLogo: logoWebpDataUrl,
    }

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
      userId,
      realmId,
      endDate: userData.endDate,
      startDate: userData.startDate,
    }),
  )
  await Promise.all(insertPromises)
  res.status(200).json({ ok: true })
}

export default createAuthorisedHandler(handler, ["POST"])
