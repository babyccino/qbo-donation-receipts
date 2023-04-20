import { PDFViewer, PDFDownloadLink } from "../../lib/pdfviewer"

import {
  CompanyInfo,
  Donation,
  getCompanyData,
  getCustomerData,
  getCustomerSalesReport,
} from "../../lib/qbo-api"
import { ReceiptPdfDocument } from "../../components/receipt"
import styles from "./generate-receipts.module.scss"

export default function IndexPage({
  customerData,
  companyInfo,
}: {
  customerData: Donation[]
  companyInfo: CompanyInfo
}) {
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
              name: companyInfo.name,
              address: companyInfo.address,
              registrationNumber: "ABC123",
              country: companyInfo.country,
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

import {
  createDonationsFromSalesReport,
  addBillingAddressesToDonations,
  parseCompanyInfo,
} from "../../lib/qbo-api"
import { Session } from "../../lib/util"

function getProducts(session: Session, query: ParsedUrlQuery): Set<number> {
  const { items } = query
  // TODO if no list of items is given retrieve from server the last selection
  if (!items) return new Set()

  return typeof items == "string"
    ? new Set(items.split("+").map(str => parseInt(str)))
    : new Set(items.map(id => parseInt(id)))
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const [salesReport, customerQueryResult, companyInfoQueryResult] = await Promise.all([
    getCustomerSalesReport(session, context),
    getCustomerData(session),
    getCompanyData(session),
  ])

  // console.log("access token: ", session.accessToken)

  const products = getProducts(session, context.query)
  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )
  const companyInfo = parseCompanyInfo(companyInfoQueryResult)

  return {
    props: {
      session,
      customerData,
      companyInfo,
    },
  }
}
