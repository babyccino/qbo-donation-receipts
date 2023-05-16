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
import { Button, Svg, buttonStyling } from "@/components/ui"
import { alreadyFilledIn } from "@/lib/app-api"
import { DbUser, user } from "@/lib/db"
import { getThisYear } from "@/lib/util"

function DownloadAllFiles() {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    const response = await fetch("/api/receipts")
    if (!response.ok) throw new Error()
    setLoading(false)
    download(await response.blob())
  }

  return (
    <div className="inline-flex items-center mx-auto mb-4 p-6 space-x-4 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
      <p className="font-normal text-gray-700 dark:text-gray-400">Download all receipts</p>
      <div className="w-12 h-12 text-gray-500 flex items-center">
        <Svg.HandDrawnRightArrow />
      </div>
      <Button onClick={onClick}>{loading ? "...Zipping your receipts" : "Download"}</Button>
    </div>
  )
}

type Props =
  | {
      customerData: Donation[]
      doneeInfo: DoneeInfo
      session: Session
      filledIn: null
    }
  | {
      filledIn: { items: boolean; details: boolean }
    }

export default function IndexPage(props: Props) {
  if (props.filledIn)
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
    const receipt = (
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
                {receipt}
              </PDFViewer>
            </div>
          </Button>
        </td>
        <td className="px-6 py-4">
          <PDFDownloadLink document={receipt} fileName={fileName} className={buttonStyling}>
            {({ loading }) => (loading ? "Loading document..." : "Download")}
          </PDFDownloadLink>
        </td>
      </tr>
    )
  }

  return (
    <>
      <DownloadAllFiles />
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
    </>
  )
}

// --- server-side props ---

function getProducts({ items }: ParsedUrlQuery, dbUser: DbUser): Set<number> {
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

function getDoneeInfo(query: ParsedUrlQuery, dbUser: DbUser): DoneeInfo {
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
  const products = getProducts(query, dbUser)
  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )

  return {
    props: {
      session,
      customerData,
      doneeInfo,
    },
  }
}
