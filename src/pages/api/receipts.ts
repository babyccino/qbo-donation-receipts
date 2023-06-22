import JSZip from "jszip"

import { user } from "@/lib/db"
import {
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  getCustomerData,
  getCustomerSalesReport,
} from "@/lib/qbo-api"
import { ReceiptPdfDocument } from "@/components/receipt"
import { renderToBuffer } from "@react-pdf/renderer"
import { getThisYear } from "@/lib/util/date"
import { AuthorisedHandler, createAuthorisedHandler } from "@/lib/app-api"
import { ApiError } from "next/dist/server/api-utils"
import { downloadImagesForDonee } from "@/lib/db-helper"

const handler: AuthorisedHandler = async (req, res, session) => {
  const doc = await user.doc(session.user.id).get()

  const dbUser = doc.data()
  if (!dbUser) throw new ApiError(401, "No user data found in database")
  if (!dbUser.donee || !dbUser.donee) throw new ApiError(401, "User data incomplete")
  const doneeInfo = dbUser.donee
  if (!(doneeInfo.signature && doneeInfo.smallLogo))
    throw new Error("Either the donor's signature or logo image has not been set")

  const [salesReport, customerQueryResult, donee] = await Promise.all([
    getCustomerSalesReport(session, dbUser),
    getCustomerData(session),
    downloadImagesForDonee(dbUser.donee),
  ])

  if (salesReport.Fault) throw new ApiError(400, "QBO did not return a sales report")

  const products = new Set(dbUser.items)

  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )

  const zip = new JSZip()
  let counter = getThisYear()
  for (const entry of customerData) {
    const buffer = await renderToBuffer(
      ReceiptPdfDocument({
        currency: "USD",
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

  // TODO use firebase auth and send a download link instead of actual zip file
  // const file = storageBucket.file(`${id}/receipts.zip`)
  // await file.save(zipBuffer, { contentType: "zip" })
  // file.makePublic()

  // res.status(200).json({ url: file.publicUrl() })

  res.setHeader("Content-Type", "application/zip").status(200).send(zipBuffer)
}

export default createAuthorisedHandler(handler, ["GET"])
