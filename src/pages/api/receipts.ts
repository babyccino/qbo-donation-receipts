import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import JSZip from "jszip"

import { authOptions } from "./auth/[...nextauth]"
import { user } from "@/lib/db"
import {
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  getCustomerData,
  getCustomerSalesReport,
} from "@/lib/qbo-api"
import { ReceiptPdfDocument } from "@/components/receipt"
import { renderToBuffer } from "@react-pdf/renderer"
import { getThisYear } from "@/lib/util"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(404).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()
  const id = session.user.id

  try {
    const doc = await user.doc(session.user.id).get()

    const dbUser = doc.data()
    if (!dbUser) throw new Error("No user data found in database")
    if (!dbUser.donee || !dbUser.donee) throw new Error("User data incomplete")

    const [salesReport, customerQueryResult] = await Promise.all([
      getCustomerSalesReport(session, {}, dbUser),
      getCustomerData(session),
    ])

    const doneeInfo = dbUser.donee
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
          donee: doneeInfo,
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
  } catch (error) {
    return res.status(400).end()
  }
}
