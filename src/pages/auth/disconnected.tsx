import { and, eq, isNotNull } from "drizzle-orm"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { signIn } from "next-auth/react"

import { LayoutProps } from "@/components/layout"
import { Connect } from "@/components/qbo"
import { db } from "@/lib/db"
import { accounts, sessions } from "db/schema"
import { authOptions } from "../api/auth/[...nextauth]"

const Disconnected = () => (
  <section className="flex min-h-screen flex-col p-4 sm:justify-center">
    <div className="mx-auto max-w-screen-sm px-4 py-8 text-center lg:px-6 lg:py-16">
      <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
        QuickBooks Online disconnected.
      </p>
      <p className="mb-6 text-lg font-light text-gray-500 dark:text-gray-400">
        Your QuickBooks integration has been disconnected with your current company. Click below to
        reconnect:
      </p>
      <button
        className="mx-auto inline-block"
        onClick={async e => await signIn("QBO", { callbackUrl: "/" })}
      >
        <Connect />
      </button>
    </div>
  </section>
)
export default Disconnected

// --- get server side props --- //

export const getServerSideProps: GetServerSideProps<LayoutProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return { props: { session: null } satisfies LayoutProps }

  const accountList = (await db.query.accounts.findMany({
    columns: { companyName: true, id: true },
    where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
  })) as { companyName: string; id: string }[]

  if (session.accountId === null && accountList.length > 0) {
    await db
      .update(sessions)
      .set({ accountId: accountList[0].id })
      .where(eq(sessions.userId, session.user.id))
    session.accountId = accountList[0].id
  }

  if (accountList.length > 0)
    return {
      props: {
        session,
        companies: accountList,
        selectedAccountId: session.accountId as string,
      } satisfies LayoutProps,
    }
  else
    return {
      props: {
        session,
      } satisfies LayoutProps,
    }
}
