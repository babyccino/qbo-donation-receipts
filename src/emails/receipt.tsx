import {
  Body,
  Container,
  Column,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"
import {
  Document,
  Page,
  Text as PdfText,
  View,
  StyleSheet,
  Link as PdfLink,
  Image as PdfImage,
  Font,
} from "@react-pdf/renderer"

import { Donation } from "@/lib/qbo-api"
import { DoneeInfo } from "@/types/db"
import { formatDate } from "@/lib/util/date"
import informationTableLabel = sharedStyle.informationTableLabel

const ColumnEntry = ({
  label,
  content,
  colSpan,
  align,
}: {
  content: string
  label?: string
  colSpan?: number
  align?: "center" | "right" | "left" | "justify" | "char"
}) => (
  <Column style={sharedStyle.informationTableColumn} colSpan={colSpan} align={align}>
    {label && <Text style={sharedStyle.informationTableLabel}>{label}</Text>}
    <Text style={sharedStyle.informationTableValue}>{content}</Text>
  </Column>
)

export type EmailProps = {
  donation: Donation
  receiptNo: number
  donee: DoneeInfo
  currentDate: Date
  donationDate: Date
  currency: string
}
export const DonationReceiptEmail = (props: EmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your {props.currentDate.getFullYear().toString()} {props.donee.companyName} Donation Receipt
    </Preview>
    <Body style={sharedStyle.main}>
      <DonationReceiptEmailInner {...props} />
    </Body>
  </Html>
)
export function DonationReceiptEmailInner({
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

  return (
    <Container style={sharedStyle.container}>
      <Section>
        <Column>
          <Img src={donee.smallLogo} height={42} width={42} alt={`${donee.companyName} logo`} />
        </Column>

        <Column align="right" style={sharedStyle.tableCell}>
          <Text style={sharedStyle.heading}>Receipt {receiptNo}</Text>
        </Column>
      </Section>
      <Section style={sharedStyle.informationTable}>
        <Column colSpan={2}>
          <Row>
            <ColumnEntry label="Charitable Registration Number" content={donee.companyName} />
          </Row>
          <Row>
            <ColumnEntry
              label="Charitable Registration Number"
              content={donee.registrationNumber.toString()}
            />
          </Row>
        </Column>
        <ColumnEntry label={"Address"} content={donee.companyAddress} colSpan={2} />
      </Section>
      <Section style={sharedStyle.informationTable}>
        <Column>
          <Row style={sharedStyle.informationTableRow}>
            <ColumnEntry
              label="Donations Received"
              content={donationDate.getFullYear().toString()}
            />
          </Row>
          <Row style={sharedStyle.informationTableRow}>
            <ColumnEntry label="Location Issued" content={donee.country} />
          </Row>
          <Row style={sharedStyle.informationTableRow}>
            <ColumnEntry label="Receipt Issued" content={formatDate(donationDate)} />
          </Row>
        </Column>
        <Column>
          <Row style={sharedStyle.informationTableRow} align="right">
            <ColumnEntry content={donee.signatoryName} align="right" />
          </Row>
          <Row style={sharedStyle.informationTableRow} align="right">
            <Column align="right" style={sharedStyle.informationTableColumn}>
              <Img
                src={donee.signature}
                height={100}
                width={150}
                alt={`${donee.signatoryName}'s signature`}
              />
            </Column>
          </Row>
        </Column>
      </Section>
      <Section style={sharedStyle.informationTable}>
        <Row style={sharedStyle.informationTableRow}>
          <ColumnEntry label="Donor Name" content={donation.name} colSpan={4} />
          <ColumnEntry label="Address" content={donation.address} colSpan={2} />
        </Row>
      </Section>
      <Section style={sharedStyle.productTitleTable}>
        <Text style={sharedStyle.productsTitle}>Donations</Text>
      </Section>
      <Section>
        {donation.products.map(
          ({ name, total, id }: { name: string; id: number; total: number }) => (
            <Row key={id}>
              <Column style={{ paddingLeft: "22px" }}>
                <Text style={sharedStyle.productTitle}>{name}</Text>
                <Text style={sharedStyle.productDescription}>{""}</Text>
              </Column>

              <Column style={sharedStyle.productPriceWrapper} align="right">
                <Text style={sharedStyle.productPrice}>{formatCurrency(total)}</Text>
              </Column>
            </Row>
          )
        )}
      </Section>
      <Hr style={sharedStyle.productPriceLine} />
      <Section align="right">
        <Column style={sharedStyle.tableCell} align="right">
          <Text style={sharedStyle.productPriceTotal}>Eligible Gift For Tax Purposes</Text>
        </Column>
        <Column style={sharedStyle.productPriceVerticalLine}></Column>
        <Column style={sharedStyle.productPriceLargeWrapper}>
          <Text style={sharedStyle.productPriceLarge}>{formatCurrency(donation.total)}</Text>
        </Column>
      </Section>
      <Hr style={sharedStyle.productPriceLineBottom} />
      <Section>
        <Column align="center" style={sharedStyle.block}>
          <Img src={donee.smallLogo} width={42} height={42} alt={`${donee.companyName} logo`} />
        </Column>
      </Section>
      <Text style={sharedStyle.footerCopyright}>
        Canada Revenue Agency:{" "}
        <Link href="https://www.canada.ca/charities-giving">www.canada.ca/charities-giving</Link>
      </Text>
      <Text style={sharedStyle.footerCopyright}>
        Created with: <Link href="https://donationreceipt.online/info">DonationReceipt.Online</Link>
      </Text>
    </Container>
  )
}

export const dummyEmailProps: EmailProps = {
  donation: {
    name: "John Doe",
    id: 12345,
    total: 100,
    products: [
      {
        name: "Product 1",
        id: 1,
        total: 50,
      },
      {
        name: "Product 2",
        id: 2,
        total: 50,
      },
    ],
    address: "123 Main St, City, Country",
    email: "test@test.com",
  },
  receiptNo: 98765,
  donee: {
    companyName: "Non-Profit Organization",
    companyAddress: "456 Charity Ave, City, Country",
    country: "Country",
    registrationNumber: "123456789",
    signatoryName: "Jane Smith",
    signature: "/signature.png",
    smallLogo: "/android-chrome-192x192.png",
  },
  currentDate: new Date(),
  donationDate: new Date("2023-05-17"),
  currency: "CAD",
}
const PreviewEmail = () => <DonationReceiptEmail {...dummyEmailProps} />
export default PreviewEmail

export type WithBodyProps = EmailProps & { body: string }
export const WithBody = (props: WithBodyProps) => (
  <Html>
    <Head />
    <Preview>
      Your {props.currentDate.getFullYear().toString()} {props.donee.companyName} Donation Receipt
    </Preview>
    <Body style={sharedStyle.main}>
      <Container style={sharedStyle.container}>
        <Section style={{ marginBottom: "40px" }}>
          <Img
            src={props.donee.smallLogo}
            width={42}
            height={42}
            alt={`${props.donee.companyName} logo`}
            style={sharedStyle.topLogo}
          />
          <Text style={sharedStyle.text}>{props.body}</Text>
        </Section>
        <Hr style={sharedStyle.productPriceLineBottom} />
      </Container>
      <DonationReceiptEmailInner {...props} />
    </Body>
  </Html>
)

namespace sharedStyle {
  export const topLogo = { margin: "10px auto 20px" }

  export const main = {
    fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
    backgroundColor: "#ffffff",
  }

  export const resetText = {
    margin: "0",
    padding: "0",
    lineHeight: 1.4,
  }

  export const container = {
    margin: "0 auto",
    padding: "20px 0 20px",
    width: "660px",
  }

  export const text = {
    margin: "0",
    lineHeight: "2",
    color: "#747474",
    fontWeight: 500,
    whiteSpace: "pre-line" as const,
  }

  export const tableCell = { display: "table-cell" }

  export const heading = {
    fontSize: "32px",
    fontWeight: 300,
    color: "#888888",
  }

  export const informationTable = {
    borderCollapse: "collapse" as const,
    borderSpacing: "0px",
    color: "rgb(51,51,51)",
    backgroundColor: "rgb(250,250,250)",
    borderRadius: "3px",
    fontSize: "12px",
    marginTop: "12px",
  }

  export const informationTableRow = {
    height: "46px",
  }

  export const informationTableColumn = {
    paddingLeft: "20px",
    paddingRight: "20px",
    borderStyle: "solid" as const,
    borderColor: "white",
    borderWidth: "0px 1px 1px 0px",
    height: "44px",
  }

  export const informationTableLabel = {
    ...resetText,
    color: "rgb(102,102,102)",
    fontSize: "10px",
    // textTransform: "uppercase",
  }

  export const informationTableValue = {
    fontSize: "12px",
    margin: "0",
    padding: "0",
    lineHeight: 1.4,
  }

  export const productTitleTable = {
    ...informationTable,
    margin: "30px 0 15px 0",
    height: "24px",
  }

  export const productsTitle = {
    background: "#fafafa",
    paddingLeft: "10px",
    fontSize: "14px",
    fontWeight: 500,
    margin: "0",
  }

  export const productTitle = { fontSize: "12px", fontWeight: 600, ...resetText }

  export const productDescription = {
    fontSize: "12px",
    color: "rgb(102,102,102)",
    ...resetText,
  }

  export const productPriceTotal = {
    margin: "0",
    color: "rgb(102,102,102)",
    fontSize: "10px",
    fontWeight: 600,
    padding: "0px 30px 0px 0px",
    textAlign: "right" as const,
  }

  export const productPrice = {
    fontSize: "12px",
    fontWeight: 600,
    margin: "0",
  }

  export const productPriceLarge = {
    marginTop: "20px",
    fontSize: "16px",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    textAlign: "right" as const,
  }

  export const productPriceWrapper = {
    display: "table-cell",
    padding: "0px 20px 0px 0px",
    width: "100px",
    verticalAlign: "top",
  }

  export const productPriceLine = { margin: "30px 0 0 0" }

  export const productPriceVerticalLine = {
    height: "48px",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "#EEEEEE",
  } as const

  export const productPriceLargeWrapper = { display: "table-cell", width: "90px" }

  export const productPriceLineBottom = { margin: "0 0 75px 0" }

  export const block = { display: "block" }

  export const footerCopyright = {
    margin: "25px 0 0 0",
    textAlign: "center" as const,
    fontSize: "12px",
    color: "rgb(102,102,102)",
  }
}

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

export function PdfReceipt({ donation, receiptNo, donee, donationDate, currency }: EmailProps) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency })
  const formatCurrency = formatter.format.bind(formatter)

  if (!donee.registrationNumber) throw new Error("")
  if (!donee.signatoryName) throw new Error("")

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
            <PdfField label="Donations Received" content={donationDate.getFullYear().toString()} />
            <PdfField label="Location Issued" content={donee.country} />
            <PdfField label="Receipt Issued" content={formatDate(donationDate)} />
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
          {donation.products.map(
            ({ name, total, id }: { name: string; id: number; total: number }) => (
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
            )
          )}
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
