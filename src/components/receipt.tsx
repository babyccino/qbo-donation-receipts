import styles from "./receipt.module.scss"

import { HTMLAttributes } from "react"
import Image from "next/image"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Image as PdfImage,
} from "@react-pdf/renderer"

import { formatDate, multipleClasses } from "@/lib/util"
import { CompanyInfo, Donation } from "@/lib/qbo-api"

export function HtmlReceipt({
  donation,
  receiptNo,
  donee,
  currentDate,
  donationDate,
  currency,
  className,
  ...attributes
}: {
  donation: Donation
  receiptNo: number
  donee: {
    name: string
    address: string
    registrationNumber: string
    country: string
    signatory: string
    signature: string
    smallLogo: string
    largeLogo?: string
  }
  currentDate: Date
  donationDate: Date
  currency: string
} & HTMLAttributes<HTMLDivElement>): JSX.Element {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency })
  const formatCurrency = formatter.format.bind(formatter)

  return (
    <div className={multipleClasses(styles.container, className)} {...attributes}>
      <div className={multipleClasses(styles.titles, styles.flexSpaceBetween)}>
        <h1>Official donation receipt for income tax purposes</h1>
        <h1>Receipt# {receiptNo}</h1>
      </div>
      <div className={styles.flexSpaceBetween}>
        <div className={styles.flex}>
          <Image className={styles.smallLogo} alt="small organisation logo" src={donee.smallLogo} />
          <div>
            {donee.name}
            <br />
            {donee.address}
            <br />
            Charitable registration #: {donee.registrationNumber}
            <br />
          </div>
        </div>
        <div>
          Receipt issued: {formatDate(currentDate)}
          <br />
          Year donations received: {donationDate.getFullYear()}
          <br />
          Location Issued: {donee.country}
          <br />
        </div>
      </div>
      <div className={styles.donorDetails}>
        <strong>Donated by: </strong>
        {donation.name}
        <br />
        <strong>Address: </strong>
        123 fake street
        {/* TODO donor address*/}
      </div>
      <div className={styles.flexSpaceBetween}>
        <div className={styles.gift}>
          Eligible amount of gift for tax purposes:
          <div className={styles.giftAmount}>{formatCurrency(donation.total)}</div>
        </div>
        <div className={styles.signature}>
          <Image alt="signature" src={donee.signature} />
          <div>{donee.signatory}</div>
        </div>
      </div>
      <div className={styles.alignCenter}>
        Canada Revenue Agency:&nbsp;
        <a href="https://www.canada.ca/charities-giving">www.canada.ca/charities-giving</a>
      </div>
      <hr className={styles.break} />
      <div className={styles.alignCenter}>For your own records</div>
      <Image
        className={styles.largeLogo}
        alt="large organisation logo"
        src={donee.largeLogo || donee.smallLogo}
      />
      <h2 className={styles.ownRecordsOrg}>{donee.name}</h2>
      <div className={styles.flexSpaceBetween}>
        <div>
          {donation.name}
          <br />
          123 fake street
          {/* TODO donor address*/}
        </div>
        <div>
          <strong>Receipt No:</strong> {receiptNo}
          <br />
          <strong>Receipt issued:</strong> {formatDate(currentDate)}
          <br />
          <strong>Year donations received:</strong> {donationDate.getFullYear()}
          <br />
          <strong>Total:</strong> {formatCurrency(donation.total)}
        </div>
      </div>
      <table className={multipleClasses(styles.table, styles.alignCenter)}>
        <tr className={styles.tableHeadings}>
          <th className={styles.textAlignRight}>
            <strong>Category</strong>
          </th>
          <th className={styles.textAlignLeft}>
            <strong>Amount</strong>
          </th>
        </tr>
        {donation.products.map(item => (
          <tr key={item.id}>
            <td className={styles.textAlignRight}>{item.name}</td>
            <td className={styles.textAlignLeft}>{formatCurrency(item.total)}</td>
          </tr>
        ))}
      </table>
    </div>
  )
}

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
    width: 6,
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
    width: 15,
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

export type DoneeInfo = CompanyInfo & {
  registrationNumber: string
  signatoryName: string
  signature: string
  smallLogo: string
  largeLogo?: string
}

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
          <View style={pdfStyles.flexRow}>
            {/* <PdfImage style={pdfStyles.smallLogo} src={donee.smallLogo} /> */}
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
            {/* <PdfImage src={donee.signature} /> */}
            <Text>{donee.signatory}</Text>
          </View>
        </View>
        <View style={[pdfStyles.cra, pdfStyles.flexRow]}>
          <Text>Canada Revenue Agency:&nbsp;</Text>
          <Link src="https://www.canada.ca/charities-giving">www.canada.ca/charities-giving</Link>
        </View>
        <View style={pdfStyles.break} />
        <Text style={pdfStyles.alignCenter}>For your own records</Text>
        {/* <PdfImage style={pdfStyles.largeLogo} src={donee.largeLogo || donee.smallLogo} /> */}
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
