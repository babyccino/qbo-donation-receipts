import { XMarkIcon } from "@heroicons/react/24/solid"
import {
  Document,
  PDFDownloadLink,
  PDFViewer,
  Page,
  Image as PdfImage,
  Link as PdfLink,
  Text as PdfText,
  StyleSheet,
  View,
} from "@react-pdf/renderer"
import { Button } from "flowbite-react"
import { useState } from "react"

import { buttonStyling } from "@/components/link"
import { formatDate } from "@/lib/util/date"
import { EmailProps } from "@/types/receipt"
import { downloadReceiptInner, downloadReceiptLoadingInner, showReceiptInner } from "./pdf-dumb"
import { sharedStyle } from "./sharedStyle"

const styleSheet = StyleSheet.create({
  ...sharedStyle,
  container: { display: "flex", flexDirection: "column", padding: 30, fontFamily: "Helvetica" },
  headingContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heading: { ...sharedStyle.heading },
  smallLogo: {
    height: 50,
    width: 50,
  },
  informationTable: {
    ...sharedStyle.informationTable,
    display: "flex",
    flexDirection: "row",
    paddingTop: 10,
  },
  productTitle: {
    ...sharedStyle.productTitle,
    fontFamily: "Helvetica-Bold",
  },
  totalContainer: {
    height: "48px",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderColor: "#EEEEEE",
    marginTop: 30,
    fontFamily: "Helvetica-Bold",
  },
  productPriceLargeWrapper: {
    ...sharedStyle.productPriceLargeWrapper,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "#EEEEEE",
  },
  productPriceLarge: {
    ...sharedStyle.productPriceLarge,
    margin: 0,
    fontFamily: "Helvetica-Bold",
  },
  productPrice: {
    ...sharedStyle.productPrice,
    fontFamily: "Helvetica-Bold",
  },
} as any)
const PdfField = ({
  label,
  content,
}: {
  content: string
  label?: string
  align?: "center" | "right" | "left" | "justify" | "char"
}) => (
  <View style={styleSheet.informationTableColumn}>
    {label && <PdfText style={styleSheet.informationTableLabel}>{label}</PdfText>}
    <PdfText style={styleSheet.informationTableValue}>{content}</PdfText>
  </View>
)

export function ReceiptPdfDocument({
  donation,
  receiptNo,
  donee,
  donationDate,
  currency,
}: EmailProps) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency })
  const formatCurrency = formatter.format.bind(formatter)

  if (!donee.registrationNumber) throw new Error("")
  if (!donee.signatoryName) throw new Error("")
  if (!donee.smallLogo) throw new Error("")
  if (!donee.signature) throw new Error("")

  return (
    <Document>
      <Page size="A4" style={styleSheet.container}>
        <View style={styleSheet.headingContainer}>
          <PdfImage style={styleSheet.smallLogo} src={donee.smallLogo} />

          <PdfText style={styleSheet.heading}>Receipt #{receiptNo}</PdfText>
        </View>
        <View style={styleSheet.informationTable}>
          <View>
            <PdfField label="Charitable Registration Number" content={donee.companyName} />
            <PdfField
              label="Charitable Registration Number"
              content={donee.registrationNumber.toString()}
            />
          </View>
          <PdfField label={"Address"} content={donee.companyAddress} />
        </View>
        <View style={[styleSheet.informationTable, { justifyContent: "space-between" }]}>
          <View>
            <PdfField label="Donations Received" content={donationDate} />
            <PdfField label="Location Issued" content={donee.country} />
            <PdfField label="Receipt Issued" content={formatDate(new Date())} />
          </View>
          <View style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <PdfText
              style={[styleSheet.text, styleSheet.informationTableValue, { marginRight: 10 }]}
            >
              {donee.signatoryName}
            </PdfText>
            <PdfImage style={{ height: 100, margin: 10 }} src={donee.signature} />
          </View>
        </View>
        <View style={styleSheet.informationTable}>
          <View>
            <PdfField label="Donor Name" content={donation.name} />
            <PdfField label="Address" content={donation.address} />
          </View>
        </View>
        <View style={styleSheet.productTitleTable}>
          <PdfText style={styleSheet.productsTitle}>Donations</PdfText>
        </View>
        <View>
          {donation.items.map(({ name, total, id }) => (
            <View
              key={id}
              style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ paddingLeft: "22px" }}>
                <PdfText style={styleSheet.productTitle}>{name}</PdfText>
                <PdfText style={styleSheet.productDescription}>{""}</PdfText>
              </View>

              <View style={styleSheet.productPriceWrapper}>
                <PdfText style={styleSheet.productPrice}>{formatCurrency(total)}</PdfText>
              </View>
            </View>
          ))}
        </View>
        <View style={styleSheet.totalContainer}>
          <PdfText style={styleSheet.productPriceTotal}>Eligible Gift For Tax Purposes</PdfText>
          <View style={styleSheet.productPriceLargeWrapper}>
            <PdfText style={styleSheet.productPriceLarge}>{formatCurrency(donation.total)}</PdfText>
          </View>
        </View>
        <View style={{ marginTop: 20 }}>
          <PdfImage
            style={[styleSheet.smallLogo, { marginHorizontal: "auto" }]}
            src={donee.smallLogo}
          />
        </View>
        <PdfText style={styleSheet.footerCopyright}>
          Official donation receipt for income tax purposes
        </PdfText>
        <PdfText style={[styleSheet.footerCopyright, { margin: "10px 0 0 0" }]}>
          Canada Revenue Agency:{" "}
          <PdfLink src="https://www.canada.ca/charities-giving">
            www.canada.ca/charities-giving
          </PdfLink>
        </PdfText>
      </Page>
    </Document>
  )
}

export const DownloadReceipt = ({
  fileName,
  receiptProps,
}: {
  fileName: string
  receiptProps: EmailProps
}) => (
  <PDFDownloadLink
    document={<ReceiptPdfDocument {...receiptProps} />}
    fileName={fileName}
    className={buttonStyling + " relative"}
  >
    {({ loading }) => (loading ? downloadReceiptLoadingInner : downloadReceiptInner)}
  </PDFDownloadLink>
)

export function ShowReceipt({ receiptProps }: { receiptProps: EmailProps }) {
  const [show, setShow] = useState(false)

  const containerClass =
    (show ? "flex" : "hidden") + " fixed inset-0 p-4 justify-center bg-black bg-opacity-50 z-40"
  return (
    <>
      <Button onClick={() => setShow(true)} color="blue">
        {showReceiptInner}
      </Button>
      <div className={containerClass} onClick={() => setShow(false)}>
        <div className="relative h-full w-full max-w-[800px] rounded-md bg-[#323639] pt-6">
          <PDFViewer style={{ width: "100%", height: "100%", maxWidth: "800px" }}>
            <ReceiptPdfDocument {...receiptProps} />
          </PDFViewer>
          <button
            type="button"
            className="absolute right-1 top-1 ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={() => setShow(false)}
          >
            <XMarkIcon className="w-6" />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
      </div>
    </>
  )
}
