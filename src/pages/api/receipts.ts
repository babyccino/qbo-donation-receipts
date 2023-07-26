import { ApiError } from "next/dist/server/api-utils"
import JSZip from "jszip"

import { user } from "@/lib/db"
import { getDonations } from "@/lib/qbo-api"
import { ReceiptPdfDocument } from "@/components/receipt"
import { renderToBuffer } from "@react-pdf/renderer"
import { getThisYear } from "@/lib/util/date"
import {
  assertSessionIsQboConnected,
  AuthorisedHandler,
  createAuthorisedHandler,
  receiptReady,
} from "@/lib/app-api"
import { downloadImagesForDonee } from "@/lib/db-helper"

const handler: AuthorisedHandler = async (req, res, session) => {
  const doc = await user.doc(session.user.id).get()
  assertSessionIsQboConnected(session)

  const dbUser = doc.data()
  if (!dbUser) throw new ApiError(401, "No user data found in database")
  if (!receiptReady(dbUser)) throw new ApiError(401, "Data missing from user")

  const [donations, donee] = await Promise.all([
    getDonations(session.accessToken, session.realmId, dbUser.date, dbUser.items),
    downloadImagesForDonee(dbUser.donee),
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
      })
    )
    zip.file(`${entry.name}.pdf`, buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
  res.setHeader("Content-Type", "application/zip").status(200).send(zipBuffer)
}

export default createAuthorisedHandler(handler, ["GET"])
