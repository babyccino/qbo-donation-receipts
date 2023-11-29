import { and, eq } from "drizzle-orm"
import JSZip from "jszip"
import { ApiError } from "next/dist/server/api-utils"

import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { storageBucket } from "@/lib/db"
import { downloadImagesForDonee } from "@/lib/db-helper"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { getDonations } from "@/lib/qbo-api"
import { getThisYear } from "@/lib/util/date"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/util/request-server"
import { renderToBuffer } from "@react-pdf/renderer"
import { accounts } from "db/schema"

const handler: AuthorisedHandler = async (req, res, session) => {
  const { realmid: realmId } = req.query

  if (typeof realmId !== "string") throw new ApiError(500, "realmid not provided")

  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, session.user.id), eq(accounts.realmId, realmId)),
    columns: {
      id: true,
      accessToken: true,
      realmId: true,
      createdAt: true,
      expiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
      scope: true,
    },
    with: {
      userData: {
        columns: {
          items: true,
          startDate: true,
          endDate: true,
        },
      },
      doneeInfo: {
        columns: {
          accountId: false,
          createdAt: false,
          id: false,
          updatedAt: false,
        },
      },
    },
  })

  if (!account) throw new ApiError(401, "account not found for given userid and company realmid")

  const { doneeInfo, userData } = account
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