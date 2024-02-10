import { and, desc, eq, isNotNull } from "drizzle-orm"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"

import { LayoutProps } from "@/components/layout"
import {
  disconnectedRedirect,
  refreshTokenIfNeeded,
  signInRedirect,
} from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { EmailStatus } from "@/types/resend"
import { accounts, receipts, sessions } from "db/schema"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { useRouter } from "next/router"

type RecipientStatus = { email: string; emailStatus: EmailStatus }
type Props = { recipients: RecipientStatus[]; refresh: boolean } & LayoutProps

const getPillColor = (status: EmailStatus) => {
  switch (status) {
    case "sent":
      return "bg-gray-300 text-gray-900 dark:text-gray-200 dark:bg-zinc-800"
    case "not_sent":
      return "bg-red-300 text-gray-900 dark:text-gray-200 dark:bg-red-900"
    case "delivery_delayed":
      return "bg-stone-300 text-gray-900 dark:text-gray-200 dark:bg-stone-700"
    case "delivered":
      return "bg-green-300 text-gray-900 dark:text-gray-200 dark:bg-green-900"
    case "opened":
      return "bg-cyan-300 text-gray-900 dark:text-gray-200 dark:bg-cyan-900"
    case "clicked":
      return "bg-blue-300 text-gray-900 dark:text-gray-200 dark:bg-blue-900"
    case "bounced":
      return "bg-red-300 text-gray-900 dark:text-gray-200 dark:bg-red-900"
    case "complained":
    default:
      return "bg-orange-300 text-gray-900 dark:text-gray-200 dark:bg-orange-800"
  }
}

export default function Campaign({ recipients, refresh }: Props) {
  const router = useRouter()
  if (refresh) {
    setTimeout(() => {
      router.replace(router.asPath)
    }, 2500)
  }

  return (
    <div className="sm:py-8">
      <table className="rounded-lg border-collapse overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="cursor-pointer px-6 py-3">
              Donor Email
            </th>
            <th scope="col" className="cursor-pointer px-6 py-3">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {recipients.map((recipient, i) => (
            <tr
              key={i}
              className="relative border-b bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-6 py-3 font-medium text-gray-900 dark:text-white"
              >
                {recipient.email}
              </th>
              <th
                scope="row"
                className={
                  "whitespace-nowrap px-6 py-3 font-medium font-mono " +
                  getPillColor(recipient.emailStatus)
                }
              >
                {recipient.emailStatus}
              </th>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, params }) => {
  if (!params) return { notFound: true }
  const id = params.id
  if (typeof id !== "string") return { notFound: true }

  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("items")

  const [account, accountList, recipients] = await Promise.all([
    db.query.accounts.findFirst({
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
        userData: { columns: { items: true, startDate: true, endDate: true } },
        doneeInfo: { columns: { id: true } },
      },
      orderBy: desc(accounts.updatedAt),
    }),
    db.query.accounts.findMany({
      columns: { companyName: true, id: true },
      where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
      orderBy: desc(accounts.updatedAt),
    }) as Promise<{ companyName: string; id: string }[]>,
    db.query.receipts.findMany({
      where: eq(receipts.campaignId, id),
      columns: { email: true, emailStatus: true },
      orderBy: desc(receipts.email),
    }),
  ])
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

  await refreshTokenIfNeeded(account)

  return {
    props: {
      companies: accountList,
      session,
      selectedAccountId: session.accountId,
      recipients: [
        ...recipients,
        { email: "test@test.com", emailStatus: "delivery_delayed" },
        { email: "test@test.com", emailStatus: "delivered" },
        { email: "test@test.com", emailStatus: "opened" },
        { email: "test@test.com", emailStatus: "clicked" },
        { email: "test@test.com", emailStatus: "bounced" },
        { email: "test@test.com", emailStatus: "complained" },
      ],
      refresh: recipients.some(
        r => r.emailStatus === "delivery_delayed" || r.emailStatus === "sent",
      ),
    } satisfies Props,
  }
}
