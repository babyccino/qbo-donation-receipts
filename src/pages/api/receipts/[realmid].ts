import JSZip from "jszip"
import { ApiError } from "next/dist/server/api-utils"

import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { storageBucket } from "@/lib/db"
import { downloadImagesForDonee, isUserDataComplete } from "@/lib/db-helper"
import { getDonations } from "@/lib/qbo-api"
import { getThisYear } from "@/lib/util/date"
import { assertSessionIsQboConnected } from "@/lib/auth/next-auth-helper"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/util/request-server"
import { renderToBuffer } from "@react-pdf/renderer"
import { db } from "@/lib/db/test"
import { accounts, doneeInfos, userDatas, users } from "db/schema"
import { and, eq, or } from "drizzle-orm"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"

const handler: AuthorisedHandler = async (req, res, session) => {
  const { realmid: realmId } = req.query
  if (typeof realmId !== "string") throw new ApiError(500, "realmid not provided")

  const rows = await db
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
    .where(and(eq(users.id, session.user.id), eq(accounts.realmId, realmId)))
    .limit(1)

  const row = rows.at(0)
  if (!row) throw new ApiError(500, "user not found in db")
  const { account, doneeInfo, userData } = row
  if (!account || account.scope !== "accounting" || !account.accessToken)
    throw new ApiError(401, "client not qbo-connected")

  if (!doneeInfo || !userData) throw new ApiError(400, "Data missing from user")

  await refreshTokenIfNeeded(account)

  const [donations, donee] = await Promise.all([
    getDonations(
      account.accessToken,
      realmId,
      { startDate: userData.startDate, endDate: userData.endDate },
      userData.items ? userData.items.split(",") : [],
    ),
    downloadImagesForDonee(doneeInfo, storageBucket),
  ])

  const zip = new JSZip()
  let counter = getThisYear()
  for (const entry of donations) {
    const buffer = await renderToBuffer(
      ReceiptPdfDocument({
        currency: "CAD",
        currentDate: new Date(),
        donation: entry,
        donationDate: new Date(),
        donee,
        receiptNo: counter++,
      }),
    )
    zip.file(`${entry.name}.pdf`, buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
  res.setHeader("Content-Type", "application/zip").status(200).send(zipBuffer)
}

export default createAuthorisedHandler(handler, ["GET"])
