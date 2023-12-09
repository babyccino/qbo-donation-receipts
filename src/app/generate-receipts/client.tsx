"use client"

import { Button, Card } from "flowbite-react"
import { ReactNode, useState } from "react"
import { twMerge } from "tailwind-merge"

import {
  DownloadReceiptLoading,
  DummyDownloadReceipt,
  DummyShowReceipt,
  ShowReceiptLoading,
} from "@/components/receipt/pdf-dumb"
import { getThisYear } from "@/lib/util/date"
import { randInt } from "@/lib/util/etc"
import { dynamic } from "@/lib/util/nextjs-helper"
import { fetchJsonData, subscribe } from "@/lib/util/request"
import { Donation } from "@/types/qbo-api"
import { EmailProps } from "@/types/receipt"
import { DoneeInfo } from "db/schema"
import download from "downloadjs"

const DownloadReceipt = dynamic(
  () => import("@/components/receipt/pdf").then(imp => imp.DownloadReceipt),
  {
    loading: DownloadReceiptLoading,
    ssr: false,
    loadImmediately: true,
  },
)
const ShowReceipt = dynamic(() => import("@/components/receipt/pdf").then(imp => imp.ShowReceipt), {
  loading: ShowReceiptLoading,
  ssr: false,
  loadImmediately: true,
})

const ReceiptLimitCard = () => (
  <Card className="absolute max-w-sm sm:left-1/2 sm:top-6 sm:-translate-x-1/2">
    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
      You{"'"}ve hit your free receipt limit
    </h5>
    <p className="font-normal text-gray-700 dark:text-gray-400">
      To save and send all of your organisation{"'"}s receipts click the link below to go pro
    </p>
    <div className="">
      <Button color="blue" onClick={() => subscribe("/generate-receipts")}>
        Click here to go pro!
      </Button>
    </div>
  </Card>
)

const names = [
  "Jeff",
  "Jeffina",
  "Jefferly",
  "Jefferson",
  "Formerly",
  "Jefferton",
  "McJeff",
  "Geoff",
  "Breff",
  "Jeffany",
  "Jeffry",
  "Jeffy",
  "Jeffery",
  "Jefferey",
  "Jeffory",
  "Geoffrey",
  "Jeffeory",
  "Geffrey",
  "Chef",
]
const getRandomName = () => `${names[randInt(0, names.length)]} ${names[randInt(0, names.length)]}`
const getRandomBalance = () => {
  const mag = randInt(2, 5)
  return `$${Math.floor(Math.random() * Math.pow(10, mag))}.00`
}

const Tr = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <tr
    className={twMerge(
      className,
      "relative border-b bg-white dark:border-gray-700 dark:bg-gray-800",
    )}
  >
    {children}
  </tr>
)
const Th = ({ children }: { children?: ReactNode }) => (
  <th scope="row" className="whitespace-nowrap px-6 py-2 font-medium text-gray-900 dark:text-white">
    {children}
  </th>
)
const Td = ({ children }: { children?: ReactNode }) => <td className="px-6 py-2">{children}</td>

const blurredRows = new Array(10).fill(0).map((_, idx) => (
  <Tr key={idx}>
    <Th>{getRandomName()}</Th>
    <Td>{getRandomBalance()}</Td>
    <Td>
      <DummyShowReceipt />
    </Td>
    <Td>
      <DummyDownloadReceipt />
    </Td>
    <div
      className={twMerge(
        !idx && "z-10",
        "absolute left-0 top-[2px] h-full w-full backdrop-blur-sm",
      )}
    >
      {!idx && <ReceiptLimitCard />}
    </div>
  </Tr>
))

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
function getNameSort(sort: Sort): ReactNode {
  if (sort === Sort.NameAsc) return "▾"
  if (sort === Sort.NameDesc) return "▴"
  return unsortedSymbol
}
function getTotalSort(sort: Sort): ReactNode {
  if (sort === Sort.TotalAsc) return "▴"
  if (sort === Sort.TotalDesc) return "▾"
  return unsortedSymbol
}

const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "CAD" })

export function Table({
  doneeInfo,
  subscribed,
  donations,
}: {
  donations: Donation[]
  doneeInfo: Omit<DoneeInfo, "accountId" | "createdAt" | "id" | "updatedAt">
  subscribed: boolean
}) {
  const [sort, setSort] = useState<Sort>(Sort.Default)

  const sortedDonations = getSortedDonations(donations, sort)

  const currentYear = getThisYear()
  const mapCustomerToTableRow = (entry: Donation, index: number): JSX.Element => {
    const fileName = `${entry.name}.pdf`
    const receiptProps: EmailProps = {
      currency: "CAD",
      currentDate: new Date(),
      donation: entry,
      donationDate: new Date(),
      donee: doneeInfo,
      receiptNo: currentYear + index,
    }

    return (
      <Tr key={entry.donorId}>
        <Th>{entry.name}</Th>
        <Td>{formatter.format(entry.total)}</Td>
        <Td>
          <ShowReceipt receiptProps={receiptProps} />
        </Td>
        <Td>
          <DownloadReceipt receiptProps={receiptProps} fileName={fileName} />
        </Td>
      </Tr>
    )
  }

  return (
    <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
      <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
        <tr>
          <th
            scope="col"
            className="cursor-pointer px-6 py-3"
            onClick={() => setSort(sort === Sort.NameAsc ? Sort.NameDesc : Sort.NameAsc)}
          >
            Donor Name {getNameSort(sort)}
          </th>
          <th
            scope="col"
            className="cursor-pointer px-6 py-3"
            onClick={() => setSort(sort === Sort.TotalDesc ? Sort.TotalAsc : Sort.TotalDesc)}
          >
            Total {getTotalSort(sort)}
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
        {sortedDonations.map(mapCustomerToTableRow)}
        {!subscribed && blurredRows}
      </tbody>
    </table>
  )
}
export function DownloadAllFiles({ accountId }: { accountId: string }) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    const response = await fetchJsonData("/api/receipts")
    if (!response.ok) throw new Error("There was an issue downloading the ZIP file")
    setLoading(false)
    download(await response.blob())
  }

  return (
    <div className="mb-4 flex flex-row items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <p className="inline font-normal text-gray-700 dark:text-gray-400">Download all receipts</p>
      <Button onClick={onClick} disabled={loading} color="blue">
        {loading ? "...Creating download" : "Download"}
      </Button>
    </div>
  )
}
