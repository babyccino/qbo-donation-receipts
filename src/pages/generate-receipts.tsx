import { useState } from "react"
import { GetServerSidePropsContext } from "next"
import { Session, getServerSession } from "next-auth"
import { ParsedUrlQuery } from "querystring"
import Link from "next/link"
import download from "downloadjs"

import { authOptions } from "./api/auth/[...nextauth]"
import { PDFViewer, PDFDownloadLink } from "@/lib/pdfviewer"
import {
  Donation,
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  getCustomerData,
  getCustomerSalesReport,
} from "@/lib/qbo-api"
import { DoneeInfo, ReceiptPdfDocument } from "@/components/receipt"
import { Alert, Button, Svg, buttonStyling } from "@/components/ui"
import { alreadyFilledIn } from "@/lib/app-api"
import { user } from "@/lib/db"
import { getThisYear } from "@/lib/util"
import { User } from "@/types/db"

function DownloadAllFiles() {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    const response = await fetch("/api/receipts")
    if (!response.ok) throw new Error("There was an issue downloading the ZIP file")
    setLoading(false)
    download(await response.blob())
  }

  return (
    <div className="mx-auto mb-4 p-6 flex flex-row gap-6 items-baseline bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
      <p className="inline font-normal text-gray-700 dark:text-gray-400">Download all receipts</p>
      <Button onClick={onClick}>{loading ? "...Creating download" : "Download"}</Button>
    </div>
  )
}

type Props =
  | {
      status: "success"
      customerData: Donation[]
      doneeInfo: DoneeInfo
      session: Session
    }
  | {
      status: "missing data"
      filledIn: { items: boolean; details: boolean }
    }
  | { status: "error"; error: string }

export default function IndexPage(props: Props) {
  if (props.status === "error")
    return (
      <div className="flex flex-col gap-4 text-center bg-white rounded-lg shadow dark:border md:mt-8 sm:max-w-md p-6 pt-5 dark:bg-gray-800 dark:border-gray-700 mx-auto">
        <span className="col-span-full font-medium text-gray-900 dark:text-white">
          We were not able to gather your Quickbooks Online data.
        </span>
      </div>
    )

  if (props.status === "missing data")
    return (
      <div className="flex flex-col gap-4 text-center bg-white rounded-lg shadow dark:border md:mt-8 sm:max-w-md p-6 pt-5 dark:bg-gray-800 dark:border-gray-700 mx-auto">
        <span className="col-span-full font-medium text-gray-900 dark:text-white">
          Some information necessary to generate your receipts is missing
        </span>
        <div className="flex justify-evenly gap-3">
          {!props.filledIn.items && (
            <Link className={buttonStyling} href="services">
              Fill in Qualifying Items
            </Link>
          )}
          {!props.filledIn.details && (
            <Link className={buttonStyling} href="details">
              Fill in Donee Details
            </Link>
          )}
        </div>
      </div>
    )

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
  const { customerData, doneeInfo } = props

  const currentYear = getThisYear()
  const mapCustomerToTableRow = (entry: Donation, index: number): JSX.Element => {
    const fileName = `${entry.name}.pdf`
    const Receipt = () => (
      <ReceiptPdfDocument
        currency="USD"
        currentDate={new Date()}
        donation={entry}
        donationDate={new Date()}
        donee={doneeInfo}
        receiptNo={currentYear + index}
      />
    )

    return (
      <tr key={entry.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
        <th
          scope="row"
          className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {entry.name}
        </th>
        <td className="px-6 py-2">{formatter.format(entry.total)}</td>
        <td className="px-6 py-2">
          <ShowReceipt Receipt={Receipt} />
        </td>
        <td className="px-6 py-2">
          <PDFDownloadLink document={<Receipt />} fileName={fileName} className={buttonStyling}>
            {({ loading }) =>
              loading ? (
                "Loading document..."
              ) : (
                <>
                  <span className="hidden sm:inline">Download</span>
                  <span className="inline-block sm:ml-2 h-5 w-5 -mb-1">
                    <Svg.Download />
                  </span>
                </>
              )
            }
          </PDFDownloadLink>
        </td>
      </tr>
    )
  }

  // TODO add sort by total donation/name
  return (
    <>
      <DownloadAllFiles />
      <Alert
        color="info"
        className="mb-4 sm:hidden"
        icon={() => (
          <div className="h-6 w-6 mr-2">
            <Svg.RightArrow />
          </div>
        )}
      >
        Scroll right to view/download individual receipts
      </Alert>
      <div className="w-full overflow-x-auto sm:rounded-lg">
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
      </div>
    </>
  )
}

function ShowReceipt({ Receipt }: { Receipt: () => JSX.Element }) {
  const [show, setShow] = useState(false)
  const containerClassName =
    (show ? "flex" : "hidden") +
    " fixed inset-0 p-4 pt-24 sm:pt-4 justify-center bg-black bg-opacity-50 z-40"

  return (
    <>
      <Button onClick={() => setShow(true)}>
        <span className="hidden sm:inline">Show receipt</span>
        <span className="inline-block sm:ml-2 h-5 w-5">
          <Svg.Plus />
        </span>
      </Button>
      <div className={containerClassName} onClick={() => setShow(false)}>
        <PDFViewer style={{ width: "100%", height: "100%", maxWidth: "800px" }}>
          <Receipt />
        </PDFViewer>
        <button
          className="fixed right-4 top-4 h-14 w-14 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 rounded-lg dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 z-40"
          onClick={() => setShow(false)}
        >
          <Svg.Cross />
        </button>
      </div>
    </>
  )
}

// --- server-side props ---

function getProducts({ items }: ParsedUrlQuery, dbUser: User): Set<number> {
  if (items)
    return typeof items == "string"
      ? new Set(items.split("+").map(str => parseInt(str)))
      : new Set(items.map(id => parseInt(id)))

  if (!dbUser || !dbUser.items) throw new Error("items data not found in query nor database")

  return new Set(dbUser.items)
}

const doneeInfoKeys: (keyof DoneeInfo)[] = [
  "companyAddress",
  "companyName",
  "country",
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
    if (!query[key] && !donee[key]) throw new Error(`${key} wasn't found in query nor in the db`)

    donee[key] = (query[key] as string) || (donee[key] as string)
  }

  return donee
}

function getDoneeInfo(query: ParsedUrlQuery, dbUser: User): DoneeInfo {
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

  if (!dbUser || !dbUser.donee) throw new Error("donee data not found in query nor database")
  return combineQueryWithDb(query, dbUser.donee)
}

export const getServerSideProps = async ({ req, res, query }: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions)

  if (!session) throw new Error("Couldn't find session")

  const doc = await user.doc(session.user.id).get()
  // if items/date and donee details have to be in the query or in the db
  // if they aren't, a page should be rendered directing the user to fill in those forms
  const inDatabase = alreadyFilledIn(doc)
  const itemsInQueryOrDb = query.items || inDatabase.items
  const doneeDetailsInQueryOrDb = query.companyName || inDatabase.doneeDetails
  if (!(itemsInQueryOrDb && doneeDetailsInQueryOrDb))
    return {
      props: {
        status: "missing data",
        filledIn: inDatabase,
      },
    }

  const dbUser = doc.data()
  if (!dbUser) throw new Error("No user data found in database")

  const [salesReport, customerQueryResult] = await Promise.all([
    getCustomerSalesReport(session, query, dbUser),
    getCustomerData(session),
  ])

  const doneeInfo = getDoneeInfo(query, dbUser)

  if (salesReport.Fault)
    return {
      props: {
        status: "error",
        error: "",
      },
    }

  const products = getProducts(query, dbUser)
  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )

  return {
    props: {
      status: "success",
      session,
      customerData,
      doneeInfo,
    },
  }
}
