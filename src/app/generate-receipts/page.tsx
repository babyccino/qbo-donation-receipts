import { ArrowRightIcon } from "@heroicons/react/24/solid"
import { and, eq } from "drizzle-orm"
import { Alert } from "flowbite-react"
import { ApiError } from "next/dist/server/api-utils"

import { Link } from "@/components/link"
import { MissingData } from "@/components/ui"
import { disconnectedRedirect, refreshTokenIfStale } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { downloadImageAndConvertToPng } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { Show } from "@/lib/util/react"
import { accounts, sessions } from "db/schema"
import { redirect } from "next/navigation"
import { getServerSession } from "../auth-util"
import { Table } from "./client"
import { DownloadAllFiles } from "./client"

export default async function GenerateReceipts() {
  const session = await getServerSession()
  if (!session) return redirect("generate-receipts")

  let account = await db.query.accounts.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: and(
      eq(accounts.userId, session.user.id),
      session.accountId ? eq(accounts.id, session.accountId) : eq(accounts.scope, "accounting"),
    ),
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
  if (session.accountId && !account)
    throw new ApiError(500, "account for given user and session not found in db")

  // if the session does not specify an account but there is a connected account
  // then the session is connected to one of these accounts
  if (!session.accountId && account) {
    session.accountId = account.id
    await db
      .update(sessions)
      .set({ accountId: account.id })
      .where(eq(sessions.userId, session.user.id))
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
    return <MissingData filledIn={{ doneeDetails: Boolean(doneeInfo), items: Boolean(userData) }} />

  await refreshTokenIfStale(account)

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

  return (
    <section className="flex h-full w-full flex-col p-8">
      {subscribed && (
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <DownloadAllFiles accountId={accountId} />
          <div className="mb-4 flex flex-row items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
            <p className="inline font-normal text-gray-700 dark:text-gray-400">Email your donors</p>
            <Link href="/email">Email</Link>
          </div>
        </div>
      )}
      <Alert
        color="info"
        className="mb-4 sm:hidden"
        icon={() => <ArrowRightIcon className="mr-2 h-6 w-6" />}
      >
        Scroll right to view/download individual receipts
      </Alert>
      <div className="w-full overflow-x-auto overflow-y-hidden sm:rounded-lg">
        <Table
          donations={subscribed ? donations : donations.slice(0, 3)}
          doneeInfo={doneeInfo}
          subscribed={subscribed}
        />
      </div>
    </section>
  )
}
