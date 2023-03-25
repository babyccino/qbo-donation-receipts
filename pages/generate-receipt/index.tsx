import { useSession } from "next-auth/react"

import styles from "./generate-receipt.module.scss"
import { CustomerData } from "../../lib/customer-sales"

export default function IndexPage({ customerData }: { customerData: CustomerData[] }) {
  const { data: session } = useSession()

  return (
    <>
      {customerData.map(entry => (
        <div key={entry.name}>
          {entry.name} {entry.total}
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
      ))}
    </>
  )
}

// --- server-side props ---

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"

import { Session } from "../../lib/types"
import { CustomerSalesReport, processCustomerData } from "../../lib/customer-sales"
import Receipt from "../../components/receipt"

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  // TODO add date selection
  const startDate = "1970-01-01"
  const endDate = "2023-01-01"

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

  const customerData = processCustomerData(report)

  return {
    props: {
      session,
      customerData,
    },
  }
}
