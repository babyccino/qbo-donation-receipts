import { ReactNode, useState } from "react"
import { GetServerSideProps } from "next"
import { getServerSession, Session } from "next-auth"
import { twMerge } from "tailwind-merge"
import download from "downloadjs"
import { Alert, Button, Card } from "flowbite-react"

import { authOptions } from "./api/auth/[...nextauth]"
import { PDFDownloadLink, PDFViewer } from "@/lib/pdfviewer"
import {
  addBillingAddressesToDonations,
  createDonationsFromSalesReport,
  Donation,
  getCustomerData,
  getCustomerSalesReport,
} from "@/lib/qbo-api"
import { ReceiptPdfDocument } from "@/components/receipt"
import { Svg, Link, buttonStyling } from "@/components/ui"
import { user } from "@/lib/db"
import { alreadyFilledIn, isSessionQboConnected } from "@/lib/app-api"
import { getThisYear } from "@/lib/util/date"
import { DoneeInfo } from "@/types/db"
import { subscribe } from "@/lib/util/request"
import { isUserSubscribed } from "@/lib/stripe"
import { downloadImagesForDonee } from "@/lib/db-helper"

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
    <div className="mb-4 flex flex-row items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <p className="inline font-normal text-gray-700 dark:text-gray-400">Download all receipts</p>
      <Button onClick={onClick}>{loading ? "...Creating download" : "Download"}</Button>
    </div>
  )
}

const ErrorComponent = () => (
  <div className="mx-auto flex flex-col gap-4 rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-8">
    <span className="col-span-full font-medium text-gray-900 dark:text-white">
      We were not able to gather your QuickBooks Online data.
    </span>
  </div>
)

const MissingData = ({ filledIn }: { filledIn: { items: boolean; doneeDetails: boolean } }) => (
  <div className="mx-auto flex flex-col gap-4 rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-8">
    <span className="col-span-full font-medium text-gray-900 dark:text-white">
      Some information necessary to generate your receipts is missing
    </span>
    <div className="flex justify-evenly gap-3">
      {!filledIn.items && <Link href="/services">Fill in Qualifying Items</Link>}
      {!filledIn.doneeDetails && <Link href="/details">Fill in Donee Details</Link>}
    </div>
  </div>
)

const ReceiptLimitCard = () => (
  <Card className="absolute max-w-sm sm:left-1/2 sm:top-6 sm:-translate-x-1/2">
    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
      You{"'"}ve hit your free receipt limit
    </h5>
    <p className="font-normal text-gray-700 dark:text-gray-400">
      To save and send all of your organisation{"'"}s receipts click the link below to go pro
    </p>
    <div className="">
      <Button onClick={() => subscribe("/generate-receipts")}>Click here to go pro!</Button>
    </div>
  </Card>
)

const receiptInner = (
  <>
    <span className="hidden sm:inline">Show Receipt</span>
    <span className="inline-block h-5 w-5 sm:ml-2">
      <Svg.Plus />
    </span>
  </>
)
function ShowReceipt({ Receipt }: { Receipt: () => JSX.Element }) {
  const [show, setShow] = useState(false)
  const containerClassName =
    (show ? "flex" : "hidden") +
    " fixed inset-0 p-4 pt-24 sm:pt-4 justify-center bg-black bg-opacity-50 z-40"

  return (
    <>
      <Button onClick={() => setShow(true)}>{receiptInner}</Button>
      <div className={containerClassName} onClick={() => setShow(false)}>
        <PDFViewer style={{ width: "100%", height: "100%", maxWidth: "800px" }}>
          <Receipt />
        </PDFViewer>
        <button
          className="fixed right-4 top-4 z-40 h-14 w-14 rounded-lg bg-blue-700 text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          onClick={() => setShow(false)}
        >
          <Svg.CircledPlus />
        </button>
      </div>
    </>
  )
}
const FakeShowReceipt = () => <div className={buttonStyling + " inline-block"}>{receiptInner}</div>

const downloadReceiptInner = (
  <>
    <span className="hidden sm:inline">Download</span>
    <span className="-mb-1 inline-block h-5 w-5 sm:ml-2">
      <Svg.Download />
    </span>
  </>
)
const DownloadReceipt = ({
  Receipt,
  fileName,
}: {
  Receipt: () => JSX.Element
  fileName: string
}) => (
  <PDFDownloadLink document={<Receipt />} fileName={fileName} className={buttonStyling}>
    {({ loading }) => (loading ? "Loading document..." : downloadReceiptInner)}
  </PDFDownloadLink>
)
const FakeDownloadReceipt = () => (
  <div className={buttonStyling + " inline-block"}>{downloadReceiptInner}</div>
)

const rand = (min: number, max: number) => Math.random() * (max - min) + min
const { round } = Math
const names = [
  "Gus",
  "Stephanie",
  "Matthew",
  "Ryan",
  "Nicholas",
  "Spencer",
  "Papadopoulos",
  "Macdonald",
]
const getRandomIndex = () => round(rand(-0.5, names.length - 0.0001))
const getRandomName = () => `${names[getRandomIndex()]} ${names[getRandomIndex()]}`
const getRandomBalance = () => `$${round(rand(100, 100000))}.00`

const TableRow = ({
  cols,
  className,
  blur,
  hover,
}: {
  cols: [ReactNode, ReactNode, ReactNode, ReactNode]
  className?: string
  blur?: boolean
  hover?: ReactNode
}) => (
  <tr
    className={twMerge(
      "relative border-b bg-white dark:border-gray-700 dark:bg-gray-800",
      className
    )}
  >
    <th
      scope="row"
      className="whitespace-nowrap px-6 py-2 font-medium text-gray-900 dark:text-white"
    >
      {cols[0]}
    </th>
    <td className="px-6 py-2">{cols[1]}</td>
    <td className="px-6 py-2">{cols[2]}</td>
    <td className="px-6 py-2">{cols[3]}</td>
    {(blur || hover) && (
      <div
        className={
          "absolute left-0 z-40 h-full w-full" + (blur ? " top-[2px] backdrop-blur-sm" : "")
        }
      >
        {hover}
      </div>
    )}
  </tr>
)
const BlurredRows = () => (
  <>
    {new Array(10).fill(0).map((_, idx) => (
      <TableRow
        key={idx}
        cols={[
          getRandomName(),
          getRandomBalance(),
          <FakeShowReceipt key="2" />,
          <FakeDownloadReceipt key="3" />,
        ]}
        blur
      />
    ))}
  </>
)

type Props =
  | {
      status: "success"
      customerData: Donation[]
      doneeInfo: DoneeInfo
      session: Session
      subscribed: boolean
    }
  | {
      status: "missing data"
      filledIn: { items: boolean; doneeDetails: boolean }
    }
  | { status: "error"; error: string }

// ----- PAGE ----- //
export default function IndexPage(props: Props) {
  if (props.status === "error") return <ErrorComponent />
  if (props.status === "missing data") return <MissingData {...props} />

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
  const { customerData, doneeInfo, subscribed } = props

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
      <TableRow
        key={entry.id}
        cols={[
          entry.name,
          formatter.format(entry.total),
          <ShowReceipt key="2" Receipt={Receipt} />,
          <DownloadReceipt key="3" Receipt={Receipt} fileName={fileName} />,
        ]}
      />
    )
  }

  // TODO add sort by total donation/name
  return (
    <section className="flex h-full w-full flex-col p-8">
      {subscribed && (
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <DownloadAllFiles />
          <div className="mb-4 flex flex-row items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
            <p className="inline font-normal text-gray-700 dark:text-gray-400">Email your donors</p>
            <Link href="/email">Email</Link>
          </div>
        </div>
      )}
      <Alert
        color="info"
        className="mb-4 sm:hidden"
        icon={() => (
          <div className="mr-2 h-6 w-6">
            <Svg.RightArrow />
          </div>
        )}
      >
        Scroll right to view/download individual receipts
      </Alert>
      <div className="w-full overflow-x-auto overflow-y-hidden sm:rounded-lg">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
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
          <tbody>
            {customerData.map(mapCustomerToTableRow)}
            {!subscribed && (
              <>
                <TableRow
                  className="z-50"
                  cols={[
                    getRandomName(),
                    getRandomBalance(),
                    <FakeShowReceipt key="2" />,
                    <FakeDownloadReceipt key="3" />,
                  ]}
                  blur
                  hover={<ReceiptLimitCard />}
                />
                <BlurredRows />
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// --- server-side props ---
export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) throw new Error("Couldn't find session")
  if (!isSessionQboConnected(session))
    return {
      redirect: { destination: "/auth/disconnected" },
      props: {} as any,
    }

  const doc = await user.doc(session.user.id).get()
  const dbUser = doc.data()

  const inDatabase = alreadyFilledIn(dbUser)
  if (!(inDatabase.items && inDatabase.doneeDetails))
    return {
      props: {
        status: "missing data",
        filledIn: inDatabase,
      },
    }

  if (!dbUser) throw new Error("No user data found in database")

  const doneeInfo = dbUser.donee as DoneeInfo
  if (!(doneeInfo.signature && doneeInfo.smallLogo))
    throw new Error("Either the donor's signature or logo image has not been set")

  const [salesReport, customerQueryResult, donee] = await Promise.all([
    getCustomerSalesReport(session, dbUser),
    getCustomerData(session),
    downloadImagesForDonee(dbUser.donee),
  ])

  if ("Fault" in salesReport)
    return {
      props: {
        status: "error",
        error: "",
      },
    }

  const products = new Set(dbUser.items as number[])

  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, products)
  const customerData = addBillingAddressesToDonations(
    donationDataWithoutAddresses,
    customerQueryResult
  )
  const subscribed = isUserSubscribed(dbUser)

  return {
    props: {
      status: "success",
      session,
      customerData: subscribed ? customerData : customerData.slice(0, 3),
      doneeInfo: donee,
      subscribed,
    },
  }
}
