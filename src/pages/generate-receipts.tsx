import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { PDFViewer, PDFDownloadLink } from "../lib/pdfviewer"
import { ParsedUrlQuery } from "querystring"

import {
  CompanyInfo,
  Donation,
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  getCompanyInfo,
  getCustomerData,
  getCustomerSalesReport,
} from "../lib/qbo-api"
import { DoneeInfo, ReceiptPdfDocument } from "../components/receipt"
import { Session } from "../lib/util"
import { authOptions } from "./api/auth/[...nextauth]"
import { Button, buttonStyling } from "../components/ui"

type Props = {
  customerData: Donation[]
  doneeInfo: DoneeInfo
  session: Session
}

export default function IndexPage({ customerData, doneeInfo }: Props) {
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
      <tr key={entry.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {entry.name}
        </th>
        <td className="px-6 py-4">{formatter.format(entry.total)}</td>
        <td className="px-6 py-4">
          <Button className="group">
            Show receipt
            <div className="hidden fixed inset-0 p-4 group-focus-within:flex justify-center bg-black bg-opacity-50">
              <PDFViewer style={{ width: "100%", height: "100%", maxWidth: "800px" }}>
                <Receipt />
              </PDFViewer>
            </div>
          </Button>
        </td>
        <td className="px-6 py-4">
          <PDFDownloadLink document={<Receipt />} fileName={fileName} className={buttonStyling}>
            {({ loading }) => (loading ? "Loading document..." : "Download")}
          </PDFDownloadLink>
        </td>
      </tr>
    )
  }

  return (
    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
        <tr>
          <th scope="col" className="px-6 py-3">
            Donor Name
          </th>
          <th scope="col" className="px-6 py-3">
            Total
          </th>
          <th scope="col" className="px-6 py-3">
            Show Receipt
          </th>
          <th scope="col" className="px-6 py-3">
            Download Receipt
          </th>
        </tr>
      </thead>
      <tbody>{customerData.map(mapCustomerToTableRow)}</tbody>
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
  // TODO if any are missing they should be retrieved from the DB
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

export const getServerSideProps: GetServerSideProps<Props> = async context => {
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
