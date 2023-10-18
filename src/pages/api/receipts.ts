import JSZip from "jszip"
import { ApiError } from "next/dist/server/api-utils"

import { ReceiptPdfDocument } from "@/components/receipt/pdf"
import { fileStorage as firebaseFileStorage, user as firebaseUser } from "@/lib/db"
import { downloadImagesForDonee, isUserDataComplete } from "@/lib/db/db-helper"
import { getDonations } from "@/lib/qbo-api"
import { getThisYear } from "@/lib/util/date"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { FileStorage, UserData } from "@/types/db"
import { renderToBuffer } from "@react-pdf/renderer"

export const createHandler = (user: UserData, fileStorage: FileStorage) =>
  (async (req, res, session) => {
    assertSessionIsQboConnected(session)

    const userData = await user.getOrThrow(session.user.id)
    if (!isUserDataComplete(userData)) throw new ApiError(401, "Data missing from user")

    const [donations, donee] = await Promise.all([
      getDonations(session.accessToken, session.realmId, userData.dateRange, userData.items),
      downloadImagesForDonee(session.user.id, userData.donee, fileStorage),
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
  }) satisfies AuthorisedHandler

export default createAuthorisedHandler(
  authOptions,
  createHandler(firebaseUser, firebaseFileStorage),
  ["GET"],
)
