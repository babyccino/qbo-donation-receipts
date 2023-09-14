import download from "downloadjs"
import { Alert, Button, Card } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session } from "next-auth"
import { ReactNode, useState } from "react"
import { twMerge } from "tailwind-merge"

import { ReceiptPdfDocument } from "@/components/receipt"
import { Link, Svg, buttonStyling } from "@/components/ui"
import { getUserData, storageBucket } from "@/lib/db"
import {
  checkUserDataCompletion,
  downloadImagesForDonee,
  isUserDataComplete,
} from "@/lib/db-helper"
import { PDFDownloadLink, PDFViewer } from "@/lib/pdfviewer"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { getThisYear } from "@/lib/util/date"
import {
  assertSessionIsQboConnected,
  getServerSessionOrThrow,
} from "@/lib/util/next-auth-helper-server"
import { Show } from "@/lib/util/react"
import { subscribe } from "@/lib/util/request"
import { DoneeInfo } from "@/types/db"
import { Donation } from "@/types/qbo-api"
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/solid"

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
      <Button onClick={onClick} disabled={loading}>
        {loading ? "...Creating download" : "Download"}
      </Button>
    </div>
  )
}

const MissingData = ({ filledIn }: { filledIn: { items: boolean; doneeDetails: boolean } }) => (
  <div className="mx-auto flex flex-col gap-4 rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-8">
    <span className="col-span-full font-medium text-gray-900 dark:text-white">
      Some information necessary to generate your receipts is missing
    </span>
    <div className="flex justify-evenly gap-3">
      {!filledIn.items && <Link href="/items">Fill in Qualifying Items</Link>}
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

const showReceiptInner = (
  <>
    <span className="hidden sm:inline">Show Receipt</span>
    <PlusIcon className="inline-block h-5 w-5 sm:ml-2" />
  </>
)
function ShowReceipt({ Receipt }: { Receipt: () => JSX.Element }) {
  const [show, setShow] = useState(false)
  const containerClassName = twMerge(
    show ? "flex" : "hidden",
    "fixed inset-0 p-4 pt-24 sm:pt-4 justify-center bg-black bg-opacity-50 z-40",
  )

  return (
    <>
      <Button onClick={() => setShow(true)}>{showReceiptInner}</Button>
      <div className={containerClassName} onClick={() => setShow(false)}>
        <PDFViewer style={{ width: "100%", height: "100%", maxWidth: "800px" }}>
          <Receipt />
        </PDFViewer>
        <button
          className="fixed right-4 top-4 z-40 h-14 w-14 rounded-lg bg-blue-700 text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          onClick={() => setShow(false)}
        >
          <PlusCircleIcon />
        </button>
      </div>
    </>
  )
}

const downloadReceiptInner = (
  <>
    <span className="hidden sm:inline">Download</span>
    <ArrowDownTrayIcon className="-mb-1 inline-block h-5 w-5 sm:ml-2" />
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

const Tr = ({ children }: { children?: ReactNode }) => (
  <tr className="relative border-b bg-white dark:border-gray-700 dark:bg-gray-800">{children}</tr>
)
const Th = ({ children }: { children?: ReactNode }) => (
  <th scope="row" className="whitespace-nowrap px-6 py-2 font-medium text-gray-900 dark:text-white">
    {children}
  </th>
)
const Td = ({ children }: { children?: ReactNode }) => <td className="px-6 py-2">{children}</td>

const BlurredRows = () => (
  <>
    <tr className="relative border-b bg-white dark:border-gray-700 dark:bg-gray-800">
      <Th>{getRandomName()}</Th>
      <Td>{getRandomBalance()}</Td>
      <Td>
        <div className={twMerge(buttonStyling, "inline-block")}>{showReceiptInner}</div>
      </Td>
      <Td>
        <div className={twMerge(buttonStyling, "inline-block")}>{downloadReceiptInner}</div>
      </Td>
      <div className="absolute left-0 top-[2px] z-10 h-full w-full backdrop-blur-sm">
        <ReceiptLimitCard />
      </div>
    </tr>
    {new Array(10).fill(0).map((_, idx) => (
      <Tr key={idx}>
        <Th>{getRandomName()}</Th>
        <Td>{getRandomBalance()}</Td>
        <Td>
          <div className={twMerge(buttonStyling, "inline-block")}>{showReceiptInner}</div>
        </Td>
        <Td>
          <div className={twMerge(buttonStyling, "inline-block")}>{downloadReceiptInner}</div>
        </Td>
        <div className="absolute left-0 top-[2px] h-full w-full backdrop-blur-sm" />
      </Tr>
    ))}
  </>
)

type Props =
  | {
      receiptsReady: true
      session: Session
      donations: Donation[]
      doneeInfo: DoneeInfo
      subscribed: boolean
    }
  | {
      receiptsReady: false
      filledIn: { items: boolean; doneeDetails: boolean }
    }

// ----- PAGE ----- //

enum Sort {
  Default = 0,
  NameAsc,
  NameDesc,
  TotalAsc,
  TotalDesc,
}

function getSortedDonations(donations: Donation[], sort: Sort) {
  switch (sort) {
    case Sort.NameAsc:
      return donations.sort((a, b) => a.name.localeCompare(b.name))
    case Sort.NameDesc:
      return donations.sort((a, b) => b.name.localeCompare(a.name))
    case Sort.TotalAsc:
      return donations.sort((a, b) => a.total - b.total)
    case Sort.TotalDesc:
      return donations.sort((a, b) => b.total - a.total)
    case Sort.Default:
    default:
      return donations
  }
}

const unsortedSymbol = (
  <span className="relative">
    <span className="absolute translate-y-[0.21rem]">▾</span>
    <span className="absolute translate-y-[-0.21rem]">▴</span>
    <span className="opacity-0">▾</span>
  </span>
)
function getSortSymbols(sort: Sort): { name: ReactNode; total: ReactNode } {
  switch (sort) {
    case Sort.NameAsc:
      return { name: "▾", total: unsortedSymbol }
    case Sort.NameDesc:
      return { name: "▴", total: unsortedSymbol }
    case Sort.TotalAsc:
      return { total: "▴", name: unsortedSymbol }
    case Sort.TotalDesc:
      return { total: "▾", name: unsortedSymbol }
    default:
      return { name: unsortedSymbol, total: unsortedSymbol }
  }
}
export default function IndexPage(props: Props) {
  const [sort, setSort] = useState<Sort>(Sort.Default)

  if (!props.receiptsReady) return <MissingData filledIn={props.filledIn} />

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "CAD" })
  const { doneeInfo, subscribed } = props
  const donations = getSortedDonations(props.donations, sort)

  const currentYear = getThisYear()
  const mapCustomerToTableRow = (entry: Donation, index: number): JSX.Element => {
    const fileName = `${entry.name}.pdf`
    const Receipt = () => (
      <ReceiptPdfDocument
        currency="CAD"
        currentDate={new Date()}
        donation={entry}
        donationDate={new Date()}
        donee={doneeInfo}
        receiptNo={currentYear + index}
      />
    )

    return (
      <Tr key={entry.id}>
        <Th>{entry.name}</Th>
        <Td>{formatter.format(entry.total)}</Td>
        <Td>
          <ShowReceipt key="2" Receipt={Receipt} />
        </Td>
        <Td>
          <DownloadReceipt key="3" Receipt={Receipt} fileName={fileName} />
        </Td>
      </Tr>
    )
  }

  return (
    <section className="flex h-full w-full flex-col p-8">
      <Show when={subscribed}>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <DownloadAllFiles />
          <div className="mb-4 flex flex-row items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
            <p className="inline font-normal text-gray-700 dark:text-gray-400">Email your donors</p>
            <Link href="/email">Email</Link>
          </div>
        </div>
      </Show>
      <Alert
        color="info"
        className="mb-4 sm:hidden"
        icon={() => <ArrowRightIcon className="mr-2 h-6 w-6" />}
      >
        Scroll right to view/download individual receipts
      </Alert>
      <div className="w-full overflow-x-auto overflow-y-hidden sm:rounded-lg">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3"
                onClick={() => setSort(sort === Sort.NameAsc ? Sort.NameDesc : Sort.NameAsc)}
              >
                Donor Name {getSortSymbols(sort).name}
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3"
                onClick={() => setSort(sort === Sort.TotalDesc ? Sort.TotalAsc : Sort.TotalDesc)}
              >
                Total {getSortSymbols(sort).total}
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
            {donations.map(mapCustomerToTableRow)}
            {!subscribed && <BlurredRows />}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSessionOrThrow(req, res)
  assertSessionIsQboConnected(session)

  const user = await getUserData(session.user.id)
  if (!user) throw new Error("No user data found in database")

  if (!isUserDataComplete(user))
    return {
      props: {
        receiptsReady: false,
        filledIn: checkUserDataCompletion(user),
      },
    }

  const [donations, donee] = await Promise.all([
    getDonations(session.accessToken, session.realmId, user.dateRange, user.items),
    downloadImagesForDonee(user.donee, storageBucket),
  ])

  const subscribed = isUserSubscribed(user)

  return {
    props: {
      receiptsReady: true,
      session,
      donations: subscribed ? donations : donations.slice(0, 3),
      doneeInfo: donee,
      subscribed,
    },
  }
}
