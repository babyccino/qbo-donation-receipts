import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ParsedUrlQuery } from "querystring"

import { PDFViewer, PDFDownloadLink } from "@/lib/pdfviewer"
import {
  CompanyInfo,
  Donation,
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  getCompanyInfo,
  getCustomerData,
  getCustomerSalesReport,
} from "@/lib/qbo-api"
import { DoneeInfo, ReceiptPdfDocument } from "@/components/receipt"
import { Button, buttonStyling } from "@/components/ui"
import { Session } from "@/lib/util"
import { authOptions } from "./api/auth/[...nextauth]"
import { DbUser, user } from "@/lib/db"

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

async function getProducts(
  { items }: ParsedUrlQuery,
  dbUser: Promise<FirebaseFirestore.DocumentSnapshot<DbUser>>
): Promise<Set<number>> {
  if (items)
    return typeof items == "string"
      ? new Set(items.split("+").map(str => parseInt(str)))
      : new Set(items.map(id => parseInt(id)))

  const doc = await dbUser
  const dbData = doc.data()

  if (!dbData || !dbData.items) throw new Error("items data not found in query nor database")

  return new Set(dbData.items)
}

const doneeInfoKeys: (keyof DoneeInfo)[] = [
  "companyAddress",
  "companyName",
  "country",
  "largeLogo",
  "registrationNumber",
  "signatoryName",
  "signature",
  "smallLogo",
]

function doesQueryHaveAllFields(query: ParsedUrlQuery): boolean {
  for (const key of doneeInfoKeys) {
    if (!query[key] || query[key] == "") return false
  }
  return true
}

function combineQueryWithDb(query: ParsedUrlQuery, donee: DoneeInfo): DoneeInfo {
  for (const key of doneeInfoKeys) {
    if (!query.companyName && !donee.companyName)
      throw new Error(`${key} wasn't found in query nor in the db`)

    donee[key] = (query.companyName as string) || donee.companyName
  }

  return donee
}

async function getDoneeInfo(
  query: ParsedUrlQuery,
  dbUser: Promise<FirebaseFirestore.DocumentSnapshot<DbUser>>
): Promise<DoneeInfo> {
  if (doesQueryHaveAllFields(query)) {
    return {
      companyName: query.companyName as string,
      companyAddress: query.companyAddress as string,
      country: query.country as string,
      registrationNumber: query.registrationNumber as string,
      signatoryName: query.signatoryName as string,
      signature: query.signature as string,
      smallLogo: query.smallLogo as string,
    }
  }

  const doc = await dbUser
  const dbData = doc.data()

  if (!dbData || !dbData.donee) throw new Error("donee data not found in query nor database")
  return combineQueryWithDb(query, dbData.donee)
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, query }) => {
  const session: Session = (await getServerSession(req, res, authOptions)) as any

  const dbUser = user.doc(session.user.id).get()
  const [salesReport, customerQueryResult, doneeInfo, products] = await Promise.all([
    getCustomerSalesReport(session, query),
    getCustomerData(session),
    getDoneeInfo(query, dbUser),
    getProducts(query, dbUser),
  ])

  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )

  // TODO if any information is missing render a page showing what information the user has not yet entered

  return {
    props: {
      session,
      customerData,
      doneeInfo,
    },
  }
}
