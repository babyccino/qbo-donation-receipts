import { PDFViewer } from "@react-pdf/renderer"

import { DoneeInfo, ReceiptPdfDocument } from "@/components/receipt"
import { Donation } from "@/lib/qbo-api"

const props: {
  donation: Donation
  receiptNo: number
  donee: DoneeInfo
  currentDate: Date
  donationDate: Date
  currency: string
} = {
  donation: {
    name: "John Doe",
    id: 123,
    total: 1000,
    products: [
      { name: "Product A", id: 1, total: 500 },
      { name: "Product B", id: 2, total: 500 },
    ],
    address: "",
  },
  receiptNo: 12345,
  donee: {
    companyName: "Charitable Organization",
    companyAddress: "123 Main St, Anytown USA",
    registrationNumber: "12345-ABC",
    country: "USA",
    signatoryName: "Jane Smith",
    signature: "",
    smallLogo: "",
    largeLogo: "",
  },
  currentDate: new Date("2023-03-24T00:00:00.000Z"),
  donationDate: new Date("2023-03-22T00:00:00.000Z"),
  currency: "USD",
}

export default function Pdf() {
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <ReceiptPdfDocument {...props} />
    </PDFViewer>
  )
}
