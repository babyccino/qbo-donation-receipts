import { PDFViewer, PDFDownloadLink } from "../../lib/pdfviewer"

import { Donation } from "../../lib/customer-sales"
import { ReceiptPdfDocument } from "../../components/receipt"
import styles from "./generate-receipts.module.scss"

export default function IndexPage({ customerData }: { customerData: Donation[] }) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

  return (
    <>
      {customerData.map(entry => {
        const fileName = `${entry.name}.pdf`
        const Receipt = () => (
          <ReceiptPdfDocument
            currency="USD"
            currentDate={new Date()}
            donation={entry}
            donationDate={new Date()}
            donee={{
              name: "Oxfam",
              address: "123 Main Street",
              registrationNumber: "ABC123",
              country: "USA",
              signatory: "Gus Ryan",
              smallLogo: "",
              signature: "",
            }}
            receiptNo={1}
          />
        )

        return (
          <div key={entry.id}>
            <div>
              {entry.name}
              <br />
              Total: {formatter.format(entry.total)}
              <br />
              <button className={styles.button}>
                Show receipt
                <div className={styles.receipt}>
                  <PDFViewer style={{ width: "100%", height: "100%" }}>
                    <Receipt />
                  </PDFViewer>
                </div>
              </button>
              <PDFDownloadLink document={<Receipt />} fileName={fileName}>
                {({ blob, url, loading, error }) =>
                  loading ? "Loading document..." : "Download now!"
                }
              </PDFDownloadLink>
            </div>
            <br />
          </div>
        )
      })}
    </>
  )
}

// --- server-side props ---

import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import { GetServerSidePropsContext } from "next"
import { ParsedUrlQuery } from "querystring"

import { createDonationsFromSalesReport, CustomerSalesReport } from "../../lib/customer-sales"
import { Session } from "../../lib/types"
import { addBillingAddressesToDonations, CustomerQueryResult } from "../../lib/customer"

function getDates(query: ParsedUrlQuery): [string, string] {
  const { startDate, endDate } = query
  // TODO if date is not in query get from db
  if (!startDate || typeof startDate !== "string" || !endDate || typeof endDate !== "string")
    throw new Error("date data is malformed")
  return [startDate, endDate]
}

function getProducts(session: Session, query: ParsedUrlQuery): Set<number> {
  const { items } = query
  // TODO if no list of items is given retrieve from server the last selection
  if (!items) return new Set()

  return typeof items == "string"
    ? new Set(items.split("+").map(str => parseInt(str)))
    : new Set(items.map(id => parseInt(id)))
}

async function getCustomerSalesReport(
  session: Session,
  context: GetServerSidePropsContext
): Promise<CustomerSalesReport> {
  const [startDate, endDate] = getDates(context.query)

  const url =
    "https://sandbox-quickbooks.api.intuit.com/v3/company/" +
    session.realmId +
    "/reports/CustomerSales?summarize_column_by=ProductsAndServices&start_date=" +
    startDate +
    "&end_date=" +
    endDate

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/json",
    },
  })
  const report: CustomerSalesReport = await response.json()

  if (!response.ok) {
    throw { ...report, url }
  }

  return report
}

async function getCustomerData(session: Session): Promise<CustomerQueryResult> {
  const url =
    "https://sandbox-quickbooks.api.intuit.com/v3/company/" +
    session.realmId +
    "/query?query=select * from Customer MAXRESULTS 1000"

  // TODO may need to do multiple queries if the returned array is 1000, i.e. the query did not contain all customers
  // TODO this should be stored on the server so we don't have to fetch constantly

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/json",
    },
  })
  const rawData: CustomerQueryResult = await response.json()

  if (!response.ok) {
    throw { ...rawData, url }
  }

  return rawData
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const [salesReport, customers] = await Promise.all([
    getCustomerSalesReport(session, context),
    getCustomerData(session),
  ])

  const products = getProducts(session, context.query)
  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(donationDataWithoutAddresses, customers)

  return {
    props: {
      session,
      customerData,
    },
  }
}
