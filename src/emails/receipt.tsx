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

import { Donation } from "@/lib/qbo-api"
import { DoneeInfo } from "@/types/db"
import { formatDate } from "@/lib/util/date"

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
  <Column style={informationTableColumn} colSpan={colSpan} align={align}>
    {label && <Text style={informationTableLabel}>{label}</Text>}
    <Text style={informationTableValue}>{content}</Text>
  </Column>
)

type EmailProps = {
  donation: Donation
  receiptNo: number
  donee: DoneeInfo
  currentDate: Date
  donationDate: Date
  currency: string
}
export function DonationReceiptEmail({
  donation,
  receiptNo,
  donee,
  currentDate,
  donationDate,
  currency,
}: EmailProps) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency })
  const formatCurrency = formatter.format.bind(formatter)

  if (!donee.registrationNumber) throw new Error("")
  if (!donee.signatoryName) throw new Error("")

  return (
    <Html>
      <Head />
      <Preview>
        Your {currentDate.getFullYear().toString()} {donee.companyName} Donation Receipt
      </Preview>

      <Body style={main}>
        <Container style={container}>
          <Section>
            <Column>
              <Img src={donee.smallLogo} height={42} alt={`${donee.companyName} logo`} />
            </Column>

            <Column align="right" style={tableCell}>
              <Text style={heading}>Receipt {receiptNo}</Text>
            </Column>
          </Section>
          <Section style={informationTable}>
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
          <Section style={informationTable}>
            <Column>
              <Row style={informationTableRow}>
                <ColumnEntry
                  label="Donations Received"
                  content={donationDate.getFullYear().toString()}
                />
              </Row>
              <Row style={informationTableRow}>
                <ColumnEntry label="Location Issued" content={donee.country} />
              </Row>
              <Row style={informationTableRow}>
                <ColumnEntry label="Receipt Issued" content={formatDate(donationDate)} />
              </Row>
            </Column>
            <Column>
              <Row style={informationTableRow} align="right">
                <ColumnEntry content={donee.signatoryName} align="right" />
              </Row>
              <Row style={informationTableRow} align="right">
                <Column align="right" style={informationTableColumn}>
                  <Img
                    src={donee.signature}
                    height={100}
                    alt={`${donee.signatoryName}'s signature`}
                  />
                </Column>
              </Row>
            </Column>
          </Section>
          <Section style={informationTable}>
            <Row style={informationTableRow}>
              <ColumnEntry label="Donor Name" content={donation.name} colSpan={4} />
              <ColumnEntry label="Address" content={donation.address} colSpan={2} />
            </Row>
          </Section>
          <Section style={productTitleTable}>
            <Text style={productsTitle}>Donations</Text>
          </Section>
          <Section>
            {donation.products.map(
              ({ name, total, id }: { name: string; id: number; total: number }) => (
                <Row key={id}>
                  <Column style={{ paddingLeft: "22px" }}>
                    <Text style={productTitle}>{name}</Text>
                    <Text style={productDescription}>{""}</Text>
                  </Column>

                  <Column style={productPriceWrapper} align="right">
                    <Text style={productPrice}>{formatCurrency(total)}</Text>
                  </Column>
                </Row>
              )
            )}
          </Section>
          <Hr style={productPriceLine} />
          <Section align="right">
            <Column style={tableCell} align="right">
              <Text style={productPriceTotal}>Eligible Gift For Tax Purposes</Text>
            </Column>
            <Column style={productPriceVerticalLine}></Column>
            <Column style={productPriceLargeWrapper}>
              <Text style={productPriceLarge}>{formatCurrency(donation.total)}</Text>
            </Column>
          </Section>
          <Hr style={productPriceLineBottom} />
          <Section>
            <Column align="center" style={block}>
              <Img src={donee.smallLogo} width={42} height={42} alt={`${donee.companyName} logo`} />
            </Column>
          </Section>
          <Text style={footerCopyright}>
            Canada Revenue Agency:{" "}
            <Link href="https://www.canada.ca/charities-giving">
              www.canada.ca/charities-giving
            </Link>
          </Text>
          <Text style={footerCopyright}>
            Created with:{" "}
            <Link href="https://donationreceipt.online/info">DonationReceipt.Online</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
const emailProps: EmailProps = {
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
  },
  receiptNo: 98765,
  donee: {
    companyName: "Non-Profit Organization",
    companyAddress: "456 Charity Ave, City, Country",
    country: "Country",
    registrationNumber: "123456789",
    signatoryName: "Jane Smith",
    signature: "/signature.png",
    smallLogo: "/favicon.ico",
  },
  currentDate: new Date(),
  donationDate: new Date("2023-05-17"),
  currency: "USD",
}
const PreviewEmail = () => <DonationReceiptEmail {...emailProps} />
export default PreviewEmail

const main = {
  fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
  backgroundColor: "#ffffff",
}

const resetText = {
  margin: "0",
  padding: "0",
  lineHeight: 1.4,
}

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "660px",
}

const tableCell = { display: "table-cell" }

const heading = {
  fontSize: "32px",
  fontWeight: "300",
  color: "#888888",
}

const informationTable = {
  borderCollapse: "collapse" as const,
  borderSpacing: "0px",
  color: "rgb(51,51,51)",
  backgroundColor: "rgb(250,250,250)",
  borderRadius: "3px",
  fontSize: "12px",
  marginTop: "12px",
}

const informationTableRow = {
  height: "46px",
}

const informationTableColumn = {
  paddingLeft: "20px",
  paddingRight: "20px",
  borderStyle: "solid",
  borderColor: "white",
  borderWidth: "0px 1px 1px 0px",
  height: "44px",
}

const informationTableLabel = {
  ...resetText,
  color: "rgb(102,102,102)",
  fontSize: "10px",
  // textTransform: "uppercase",
}

const informationTableValue = {
  fontSize: "12px",
  margin: "0",
  padding: "0",
  lineHeight: 1.4,
}

const productTitleTable = {
  ...informationTable,
  margin: "30px 0 15px 0",
  height: "24px",
}

const productsTitle = {
  background: "#fafafa",
  paddingLeft: "10px",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0",
}

const productTitle = { fontSize: "12px", fontWeight: "600", ...resetText }

const productDescription = {
  fontSize: "12px",
  color: "rgb(102,102,102)",
  ...resetText,
}

const productPriceTotal = {
  margin: "0",
  color: "rgb(102,102,102)",
  fontSize: "10px",
  fontWeight: "600",
  padding: "0px 30px 0px 0px",
  textAlign: "right" as const,
}

const productPrice = {
  fontSize: "12px",
  fontWeight: "600",
  margin: "0",
}

const productPriceLarge = {
  margin: "0px 20px 0px 0px",
  fontSize: "16px",
  fontWeight: "600",
  whiteSpace: "nowrap" as const,
  textAlign: "right" as const,
}

const productPriceWrapper = {
  display: "table-cell",
  padding: "0px 20px 0px 0px",
  width: "100px",
  verticalAlign: "top",
}

const productPriceLine = { margin: "30px 0 0 0" }

const productPriceVerticalLine = {
  height: "48px",
  borderLeft: "1px solid",
  borderColor: "rgb(238,238,238)",
}

const productPriceLargeWrapper = { display: "table-cell", width: "90px" }

const productPriceLineBottom = { margin: "0 0 75px 0" }

const block = { display: "block" }

const footerCopyright = {
  margin: "25px 0 0 0",
  textAlign: "center" as const,
  fontSize: "12px",
  color: "rgb(102,102,102)",
}
