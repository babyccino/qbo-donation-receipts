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
    smallLogo: "/favicon.ico",
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
    fontWeight: "500",
    whiteSpace: "pre-line" as const,
  }

  export const tableCell = { display: "table-cell" }

  export const heading = {
    fontSize: "32px",
    fontWeight: "300",
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
    borderStyle: "solid",
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
    fontWeight: "500",
    margin: "0",
  }

  export const productTitle = { fontSize: "12px", fontWeight: "600", ...resetText }

  export const productDescription = {
    fontSize: "12px",
    color: "rgb(102,102,102)",
    ...resetText,
  }

  export const productPriceTotal = {
    margin: "0",
    color: "rgb(102,102,102)",
    fontSize: "10px",
    fontWeight: "600",
    padding: "0px 30px 0px 0px",
    textAlign: "right" as const,
  }

  export const productPrice = {
    fontSize: "12px",
    fontWeight: "600",
    margin: "0",
  }

  export const productPriceLarge = {
    margin: "0px 20px 0px 0px",
    fontSize: "16px",
    fontWeight: "600",
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
    borderLeft: "1px solid",
    borderColor: "rgb(238,238,238)",
  }

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
