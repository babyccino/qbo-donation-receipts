import { ApiError } from "next/dist/server/api-utils"
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
import {
  assertSessionIsQboConnected,
  AuthorisedHandler,
  createAuthorisedHandler,
} from "@/lib/app-api"
import { downloadImagesForDonee } from "@/lib/db-helper"

const handler: AuthorisedHandler = async (req, res, session) => {
  const doc = await user.doc(session.user.id).get()
  assertSessionIsQboConnected(session)

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
