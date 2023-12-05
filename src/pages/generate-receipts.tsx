import { ArrowRightIcon } from "@heroicons/react/24/solid"
import download from "downloadjs"
import { and, asc, desc, eq, isNotNull } from "drizzle-orm"
import { Alert, Button, Card } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session, getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { ReactNode, useState } from "react"
import { twMerge } from "tailwind-merge"

import { Link } from "@/components/link"
import {
  DownloadReceiptLoading,
  DummyDownloadReceipt,
  DummyShowReceipt,
  ShowReceiptLoading,
} from "@/components/receipt/pdf-dumb"
import { MissingData } from "@/components/ui"
import { disconnectedRedirect, signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { storageBucket } from "@/lib/db"
import { downloadImageAndConvertToPng } from "@/lib/db-helper"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { getThisYear } from "@/lib/util/date"
import { randInt } from "@/lib/util/etc"
import { dynamic } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { fetchJsonData, subscribe } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { Donation } from "@/types/qbo-api"
import { EmailProps } from "@/types/receipt"
import { DoneeInfo, accounts, sessions } from "db/schema"
import { LayoutProps } from "@/components/layout"

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

function DownloadAllFiles({ accountId }: { accountId: string }) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    const response = await fetchJsonData(`/api/receipts/${accountId}`)
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

type Props = (
  | {
      receiptsReady: true
      session: Session
      donations: Donation[]
      doneeInfo: Omit<DoneeInfo, "accountId" | "createdAt" | "id" | "updatedAt">
      subscribed: boolean
      accountId: string
    }
  | {
      receiptsReady: false
      filledIn: { items: boolean; doneeDetails: boolean }
      accountId: string
    }
) &
  LayoutProps

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

// ----- PAGE ----- //

export default function IndexPage(props: Props) {
  const [sort, setSort] = useState<Sort>(Sort.Default)

  if (!props.receiptsReady) return <MissingData filledIn={props.filledIn} />

  const { doneeInfo, subscribed, accountId } = props
  const donations = getSortedDonations(props.donations, sort)

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
    <section className="flex h-full w-full flex-col p-8">
      <Show when={subscribed}>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <DownloadAllFiles accountId={accountId} />
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
            {donations.map(mapCustomerToTableRow)}
            {!subscribed && blurredRows}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, query }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("generate-receipts")

  let [account, accountList] = await Promise.all([
    session.accountId
      ? db.query.accounts.findFirst({
          // if the realmId is specified get that account otherwise just get the first account for the user
          where: and(eq(accounts.userId, session.user.id), eq(accounts.id, session.accountId)),
          columns: {
            id: true,
            accessToken: true,
            scope: true,
            realmId: true,
            createdAt: true,
            expiresAt: true,
            refreshToken: true,
            refreshTokenExpiresAt: true,
          },
          with: {
            doneeInfo: {
              columns: { createdAt: false, updatedAt: false, id: false, accountId: false },
            },
            userData: { columns: { items: true, startDate: true, endDate: true } },
            user: {
              columns: {},
              with: { subscription: { columns: { status: true, currentPeriodEnd: true } } },
            },
          },
        })
      : null,
    db.query.accounts.findMany({
      columns: { companyName: true, id: true },
      where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
      orderBy: desc(accounts.updatedAt),
    }) as Promise<{ companyName: string; id: string }[]>,
  ])
  if (session.accountId && !account)
    throw new ApiError(500, "account for given user and session not found in db")

  // if the session does not specify an account but there is a connected account
  // then the session is connected to one of these accounts
  if (session.accountId === null && accountList.length > 0) {
    session.accountId = accountList[0].id
    const [_, newAccount] = await Promise.all([
      db
        .update(sessions)
        .set({ accountId: accountList[0].id })
        .where(eq(sessions.userId, session.user.id)),
      db.query.accounts.findFirst({
        where: and(eq(accounts.userId, session.user.id), eq(accounts.id, session.accountId)),
        columns: {
          id: true,
          accessToken: true,
          scope: true,
          realmId: true,
          createdAt: true,
          expiresAt: true,
          refreshToken: true,
          refreshTokenExpiresAt: true,
        },
        with: {
          doneeInfo: {
            columns: { createdAt: false, updatedAt: false, id: false, accountId: false },
          },
          userData: { columns: { items: true, startDate: true, endDate: true } },
          user: {
            columns: {},
            with: { subscription: { columns: { status: true, currentPeriodEnd: true } } },
          },
        },
      }),
    ])
    account = newAccount
  }

  if (
    !account ||
    account.scope !== "accounting" ||
    !account.accessToken ||
    !account.realmId ||
    !session.accountId
  )
    return disconnectedRedirect
  const { doneeInfo, userData, realmId } = account
  const { accountId } = session

  if (!doneeInfo || !userData)
    return {
      props: {
        receiptsReady: false,
        filledIn: { doneeDetails: Boolean(doneeInfo), items: Boolean(userData) },
        accountId: account.id,
        session,
        companies: accountList,
        selectedAccountId: account.id,
      } satisfies Props,
    }

  await refreshTokenIfNeeded(account)

  const [donations, pngSignature, pngLogo] = await Promise.all([
    getDonations(
      account.accessToken,
      realmId,
      { startDate: userData.startDate, endDate: userData.endDate },
      userData.items ? userData.items.split(",") : [],
    ),
    downloadImageAndConvertToPng(storageBucket, doneeInfo.signature),
    downloadImageAndConvertToPng(storageBucket, doneeInfo.smallLogo),
  ])
  doneeInfo.signature = pngSignature
  doneeInfo.smallLogo = pngLogo
  const subscription = account.user.subscription
  const subscribed = subscription ? isUserSubscribed(subscription) : false

  return {
    props: {
      receiptsReady: true,
      session,
      donations: subscribed ? donations : donations.slice(0, 3),
      doneeInfo,
      subscribed,
      accountId,
      companies: accountList,
      selectedAccountId: account.id,
    } satisfies Props,
  }
}
