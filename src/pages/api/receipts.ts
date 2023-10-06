import JSZip from "jszip"
import { ApiError } from "next/dist/server/api-utils"

import { ReceiptPdfDocument } from "@/components/receipt"
import { getUserData, storageBucket } from "@/lib/db"
import { downloadImagesForDonee, isUserDataComplete } from "@/lib/db-helper"
import { getDonations } from "@/lib/qbo-api"
import { getThisYear } from "@/lib/util/date"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/util/request-server"
import { renderToBuffer } from "@react-pdf/renderer"

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
      }),
    )
    zip.file(`${entry.name}.pdf`, buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })
  res.setHeader("Content-Type", "application/zip").status(200).send(zipBuffer)
}

export default createAuthorisedHandler(handler, ["GET"])
