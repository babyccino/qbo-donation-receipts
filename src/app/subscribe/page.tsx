import { and, desc, eq, isNotNull } from "drizzle-orm"
import { Button } from "flowbite-react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"

import { LayoutProps } from "@/components/layout"
import { PricingCard } from "@/components/ui"
import { signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { isUserSubscribedSql } from "@/lib/stripe"
import { subscribe } from "@/lib/util/request"
import { accounts, sessions, subscriptions } from "db/schema"
import { authOptions } from "../../auth"

export default function Subscribe() {
  return (
    <section className="p-4 sm:flex sm:min-h-screen sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard title="Your selected plan" plan="free" />
      </div>
      <div className="pt-8 text-white sm:p-14">
        <PricingCard
          title="Subscribe to use this feature"
          plan="pro"
          button={
            <Button
              onClick={e => {
                e.preventDefault()
                subscribe("/subscribe")
              }}
            >
              Go pro
            </Button>
          }
        />
      </div>
    </section>
  )
}

export const getServerSideProps: GetServerSideProps<LayoutProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("subscribe")

  const subscription = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, session.user.id), isUserSubscribedSql),
    orderBy: desc(accounts.updatedAt),
  })
  if (subscription) return { redirect: { permanent: false, destination: "/" } }

  const accountList = (await db.query.accounts.findMany({
    columns: { companyName: true, id: true },
    where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
  })) as { companyName: string; id: string }[]

  if (session.accountId !== null && accountList.length === 0)
    throw new ApiError(500, "session has account id but this was not found in the database")
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
