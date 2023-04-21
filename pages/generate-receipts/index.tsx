import styles from "./generate-receipts.module.scss"

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { PDFViewer, PDFDownloadLink } from "../../lib/pdfviewer"
import { ParsedUrlQuery } from "querystring"

import {
  CompanyInfo,
  Donation,
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  getCompanyInfo,
  getCustomerData,
  getCustomerSalesReport,
} from "../../lib/qbo-api"
import { DoneeInfo, ReceiptPdfDocument } from "../../components/receipt"
import { Session } from "../../lib/util"
import { authOptions } from "../api/auth/[...nextauth]"

export default function IndexPage({
  customerData,
  doneeInfo,
}: {
  customerData: Donation[]
  doneeInfo: DoneeInfo
}) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

  const mapCustomerToTableRow = (entry: Donation): JSX.Element => {
    const fileName = `${entry.name}.pdf`
    const Receipt = () => (
      <ReceiptPdfDocument
        currency="USD"
        currentDate={new Date()}
        donation={entry}
        donationDate={new Date()}
        donee={doneeInfo}
        receiptNo={1}
      />
    )

    return (
      <tr key={entry.id}>
        <td>{entry.name}</td>
        <td>{formatter.format(entry.total)}</td>
        <td>
          <button className={styles.showButton}>
            Show receipt
            <div className={styles.receipt}>
              <PDFViewer style={{ width: "100%", height: "100%" }}>
                <Receipt />
              </PDFViewer>
            </div>
          </button>
        </td>
        <td>
          <PDFDownloadLink document={<Receipt />} fileName={fileName} className={styles.button}>
            {({ loading }) => (loading ? "Loading document..." : "Download")}
          </PDFDownloadLink>
        </td>
      </tr>
    )
  }

  return (
    <table>
      <tr>
        <th>Donor Name</th>
        <th>Total</th>
        <th>Show Receipt</th>
        <th>Download Receipt</th>
      </tr>
      {customerData.map(mapCustomerToTableRow)}
    </table>
  )
}

// --- server-side props ---

function getProducts(session: Session, query: ParsedUrlQuery): Set<number> {
  const { items } = query
  // TODO if no list of items is given retrieve from server the last selection
  if (!items) return new Set()

  return typeof items == "string"
    ? new Set(items.split("+").map(str => parseInt(str)))
    : new Set(items.map(id => parseInt(id)))
}

function getDoneeInfo(companyInfo: CompanyInfo, query: ParsedUrlQuery): DoneeInfo {
  const {
    companyName,
    address: queryAddress,
    country: queryCountry,
    registrationNumber,
    signatoryName: signatory,
    signature,
    smallLogo,
  } = query

  const registrationNumberInvalid = !registrationNumber || typeof registrationNumber !== "string"
  const signatoryNameInvalid = !signatory || typeof signatory !== "string"
  const signatureInvalid = !signature || typeof signature !== "string"
  const smallLogoInvalid = !smallLogo || typeof smallLogo !== "string"

  if (registrationNumberInvalid || signatoryNameInvalid || signatureInvalid || smallLogoInvalid) {
    let malformed = ""
    if (registrationNumberInvalid) malformed += "registration number,"
    if (signatoryNameInvalid) malformed += "signatory name,"
    if (signatureInvalid) malformed += "signature,"
    if (smallLogoInvalid) malformed += "smallLogo,"

    throw new Error(malformed + " data is malformed")
  }

  // if any of the company info values are not provided use the fetched values
  const name =
    !companyName || companyName === "" || typeof companyName !== "string"
      ? companyInfo.name
      : companyName
  const address =
    !queryAddress || queryAddress === "" || typeof queryAddress !== "string"
      ? companyInfo.address
      : queryAddress
  const country =
    !queryCountry || queryCountry === "" || typeof queryCountry !== "string"
      ? companyInfo.country
      : queryCountry

  return {
    name,
    address,
    country,
    registrationNumber,
    signatory,
    signature,
    smallLogo,
  }
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const [salesReport, customerQueryResult, companyInfo] = await Promise.all([
    getCustomerSalesReport(session, context),
    getCustomerData(session),
    getCompanyInfo(session),
  ])

  const products = getProducts(session, context.query)
  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )
  const doneeInfo = getDoneeInfo(companyInfo, context.query)

  return {
    props: {
      session,
      customerData,
      doneeInfo,
    },
  }
}
