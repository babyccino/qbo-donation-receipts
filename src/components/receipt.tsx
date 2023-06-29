import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Image as PdfImage,
} from "@react-pdf/renderer"

import { formatDate } from "@/lib/util/date"
import { Donation } from "@/lib/qbo-api"
import { DoneeInfo } from "@/types/db"

// Create styles
const pdfStyles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 16,
    textAlign: "left",
    padding: 20,
    fontSize: 14,
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  flexColumn: {
    display: "flex",
    flexDirection: "column",
  },
  gap: { gap: 4 },
  alignCenter: {
    alignSelf: "center",
  },
  titles: {
    fontSize: 16,
    justifyContent: "space-between",
  },
  bold: {
    fontWeight: "bold",
  },
  doneeDetails: {
    justifyContent: "space-between",
    fontSize: 14,
  },
  spaceBetween: {
    justifyContent: "space-between",
  },
  smallLogo: {
    width: 50,
    height: 50,
  },
  donorDetails: {
    fontSize: 24,
    lineHeight: "150%",
  },
  gift: {
    fontSize: 13,
  },
  giftAmount: {
    fontSize: 54,
    marginTop: 8,
  },
  signature: {
    alignSelf: "flex-end",
    maxHeight: 100,
    maxWidth: 250,
  },
  img: {
    width: 10,
    borderBottom: "1px solid black",
  },
  break: {
    height: 1,
    backgroundColor: "black",
    width: "90%",
    border: "none",
    alignSelf: "center",
  },
  largeLogo: {
    height: 100,
    width: 100,
  },
  ownRecordsOrg: {
    fontSize: 14,
  },
  table: {
    width: "90%",
    alignSelf: "center",
  },
  textAlignRight: {
    textAlign: "right",
    width: "50%",
  },
  textAlignLeft: {
    textAlign: "left",
    width: "50%",
  },
  tableHeadings: {
    gap: 10,
  },
  cra: {
    fontSize: 14,
    alignSelf: "center",
  },
  borderBottom: {
    borderBottom: "1px solid black",
  },
})

// Create Document Component
export function ReceiptPdfDocument({
  donation,
  receiptNo,
  donee,
  currentDate,
  donationDate,
  currency,
}: {
  donation: Donation
  receiptNo: number
  donee: DoneeInfo
  currentDate: Date
  donationDate: Date
  currency: string
}) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency })
  const formatCurrency = formatter.format.bind(formatter)

  return (
    <Document>
      <Page size="A4" style={pdfStyles.container}>
        <View style={[pdfStyles.titles, pdfStyles.flexRow]}>
          <Text style={pdfStyles.bold}>Official donation receipt for income tax purposes</Text>
          <Text style={pdfStyles.bold}>Receipt# {receiptNo}</Text>
        </View>
        <View style={[pdfStyles.doneeDetails, pdfStyles.flexRow]}>
          <View style={[pdfStyles.flexRow, pdfStyles.gap]}>
            <PdfImage style={pdfStyles.smallLogo} src={donee.smallLogo} />
            <View>
              <Text>{donee.companyName}</Text>
              <Text>{donee.companyAddress}</Text>
              <Text>Charitable registration #: {donee.registrationNumber}</Text>
            </View>
          </View>
          <View>
            <Text>Receipt issued: {formatDate(currentDate)}</Text>
            <Text>Year donations received: {donationDate.getFullYear()}</Text>
            <Text>Location Issued: {donee.country}</Text>
          </View>
        </View>
        <View style={pdfStyles.donorDetails}>
          <Text>Donated by: {donation.name}</Text>
          <Text>Address: {donation.address}</Text>
        </View>
        <View style={[pdfStyles.spaceBetween, pdfStyles.flexRow]}>
          <View style={pdfStyles.gift}>
            <Text>Eligible amount of gift for tax purposes:</Text>
            <Text style={pdfStyles.giftAmount}>{formatCurrency(donation.total)}</Text>
          </View>
          <View style={pdfStyles.signature}>
            <PdfImage src={donee.signature} style={pdfStyles.signature} />
            <Text>{donee.signatoryName}</Text>
          </View>
        </View>
        <View style={[pdfStyles.cra, pdfStyles.flexRow]}>
          <Text>Canada Revenue Agency:&nbsp;</Text>
          <Link src="https://www.canada.ca/charities-giving">www.canada.ca/charities-giving</Link>
        </View>
        <View style={pdfStyles.break} />
        <Text style={pdfStyles.alignCenter}>For your own records</Text>
        <PdfImage style={pdfStyles.largeLogo} src={donee.largeLogo || donee.smallLogo} />
        <Text style={pdfStyles.ownRecordsOrg}>{donee.companyName}</Text>
        <View style={[pdfStyles.spaceBetween, pdfStyles.flexRow]}>
          <View>
            <Text>{donation.name}</Text>
            <Text>{donation.address}</Text>
          </View>
          <View>
            <Text>Receipt No: {receiptNo}</Text>
            <Text>Receipt issued: {formatDate(currentDate)}</Text>
            <Text>Year donations received: {donationDate.getFullYear()}</Text>
            <Text>Total: {formatCurrency(donation.total)}</Text>
          </View>
        </View>
        <View style={pdfStyles.table}>
          <View style={[pdfStyles.tableHeadings, pdfStyles.flexRow]}>
            <Text style={[pdfStyles.textAlignRight, pdfStyles.borderBottom]}>Category</Text>
            <Text style={[pdfStyles.textAlignLeft, pdfStyles.borderBottom]}>Amount</Text>
          </View>
          {donation.products.map(item => (
            <View style={[pdfStyles.tableHeadings, pdfStyles.flexRow]} key={item.id}>
              <Text style={pdfStyles.textAlignRight}>{item.name}</Text>
              <Text style={pdfStyles.textAlignLeft}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
