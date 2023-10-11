import {
  Body,
  Column,
  Container,
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

import { formatDate } from "@/lib/util/date"
import { EmailProps, WithBodyProps } from "@/types/receipt"
import { sharedStyle } from "./sharedStyle"

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
        {donation.items.map(({ name, total, id }: { name: string; id: number; total: number }) => (
          <Row key={id}>
            <Column style={{ paddingLeft: "22px" }}>
              <Text style={sharedStyle.productTitle}>{name}</Text>
              <Text style={sharedStyle.productDescription}>{""}</Text>
            </Column>

            <Column style={sharedStyle.productPriceWrapper} align="right">
              <Text style={sharedStyle.productPrice}>{formatCurrency(total)}</Text>
            </Column>
          </Row>
        ))}
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
