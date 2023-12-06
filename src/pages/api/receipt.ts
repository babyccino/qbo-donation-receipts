import { and, eq } from "drizzle-orm"
import JSZip from "jszip"
import { ApiError } from "next/dist/server/api-utils"

import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { storageBucket } from "@/lib/db/firebase"
import { downloadImagesForDonee } from "@/lib/db/db-helper"
import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { getDonations } from "@/lib/qbo-api"
import { getThisYear } from "@/lib/util/date"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/util/request-server"
import { renderToBuffer } from "@react-pdf/renderer"
import { accounts } from "db/schema"

const handler: AuthorisedHandler = async (req, res, session) => {
  if (!session.accountId) throw new ApiError(401, "user not connected")

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, session.accountId),
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
  if (!account.realmId) throw new ApiError(401, "user not connected")

  const { doneeInfo, userData } = account
  if (!account || account.scope !== "accounting" || !account.accessToken)
    throw new ApiError(401, "client not qbo-connected")

  if (!doneeInfo || !userData) throw new ApiError(400, "Data missing from user")

  await refreshTokenIfNeeded(account)

  const [donations, donee] = await Promise.all([
    getDonations(
      account.accessToken,
      account.realmId,
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
