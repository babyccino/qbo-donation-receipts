import { useSession } from "next-auth/react"

import { CustomerData } from "../../lib/customer-sales"
import styles from "./generate-receipt.module.scss"

export default function IndexPage({ customerData }: { customerData: CustomerData[] }) {
  const { data: session } = useSession()

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

  return (
    <>
      {customerData.map(entry => (
        <>
          <div key={entry.name}>
            {entry.name}
            <br />
            Total: {formatter.format(entry.total)}
            <br />
            <button className={styles.button}>
              Show receipt
              <div className={styles.receipt}>
                <Receipt
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
                  }}
                  receiptNo={1}
                />
              </div>
            </button>
          </div>
          <br />
        </>
      ))}
    </>
  )
}

// --- server-side props ---

import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import { GetServerSidePropsContext } from "next"
import { ParsedUrlQuery } from "querystring"

import { processCustomerData, CustomerSalesReport } from "../../lib/customer-sales"
import Receipt from "../../components/receipt"
import { Session } from "../../lib/types"

function getProducts(session: Session, query: ParsedUrlQuery): Set<number> {
  const { products } = query
  // TODO if no list of products is given retrieve from server the last selection
  if (!products) return new Set()

  return typeof products == "string"
    ? new Set([parseInt(products)])
    : new Set(products.map(id => parseInt(id)))
}

function makeUrl(realmId: string, startDate: string, endDate: string): string {
  return (
    "https://sandbox-quickbooks.api.intuit.com/v3/company/" +
    realmId +
    "/reports/CustomerSales?summarize_column_by=ProductsAndServices&start_date=" +
    startDate +
    "&end_date=" +
    endDate
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  // TODO add date selection
  const startDate = "1970-01-01"
  const endDate = "2023-01-01"

  const url = makeUrl(session.realmId, startDate, endDate)

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

  const products = getProducts(session, context.query)
  const customerData = processCustomerData(report, products)

  return {
    props: {
      session,
      customerData,
    },
  }
}
