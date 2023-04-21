import { PDFViewer } from "@react-pdf/renderer"
import { ReceiptPdfDocument } from "../components/receipt"
import { renderToString } from "react-dom/server"

const props = {
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
    name: "Charitable Organization",
    address: "123 Main St, Anytown USA",
    registrationNumber: "12345-ABC",
    country: "USA",
    signatory: "Jane Smith",
    signature: "",
    smallLogo: "",
    largeLogo: "",
  },
  currentDate: new Date("2023-03-24T00:00:00.000Z"),
  donationDate: new Date("2023-03-22T00:00:00.000Z"),
  currency: "USD",
}

export default function Pdf() {
  const html = renderToString(
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <ReceiptPdfDocument {...props} />
    </PDFViewer>
  )

  return <div>{html}</div>
}
