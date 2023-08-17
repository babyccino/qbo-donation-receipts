import { ApiError } from "next/dist/server/api-utils"
import JSZip from "jszip"

import { getUserData, storageBucket } from "@/lib/db"
import { getDonations } from "@/lib/qbo-api"
import { ReceiptPdfDocument } from "@/components/receipt"
import { renderToBuffer } from "@react-pdf/renderer"
import { getThisYear } from "@/lib/util/date"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/util/request-server"
import { isUserDataComplete } from "@/lib/db-helper"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { downloadImagesForDonee } from "@/lib/db-helper"

const handler: AuthorisedHandler = async (req, res, session) => {
  assertSessionIsQboConnected(session)

  const user = await getUserData(session.user.id)
  if (!isUserDataComplete(user)) throw new ApiError(401, "Data missing from user")

  const [donations, donee] = await Promise.all([
    getDonations(session.accessToken, session.realmId, user.dateRange, user.items),
    downloadImagesForDonee(user.donee, storageBucket),
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
