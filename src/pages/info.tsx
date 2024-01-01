import { and, eq, isNotNull } from "drizzle-orm"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import Image from "next/image"

import { LayoutProps } from "@/components/layout"
import { db } from "@/lib/db"
import { accounts, sessions } from "db/schema"
import { authOptions } from "./api/auth/[...nextauth]"

const Info = () => (
  <section className="flex min-h-screen flex-col p-4 sm:flex-row sm:justify-center">
    <div className="mx-auto max-w-screen-xl items-center gap-16 px-4 py-8 lg:grid lg:grid-cols-2 lg:px-6 lg:py-16">
      <div className="font-light text-gray-500 dark:text-gray-400 sm:text-lg">
        <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Speed up your organisation{"'"}s year-end
        </h2>
        <p className="mb-4">
          With DonationReceipt.Online, managing your donation receipts has never been easier.
          Download, preview, and automatically send your donation receipts to your donors. Our
          application seamlessly integrate with QuickBooks Online by signing in to
          DonationReceipt.Online using your QuickBooks account. By utilizing your QuickBooks Online
          data, we simplify the process of creating personalized donation receipts for your donors.
          Simplify your receipt management and enhance your donor relationships with
          DonationReceipt.Online.
        </p>
      </div>
      <div className="relative mt-8 grid grid-cols-2 gap-4">
        <Image
          className="w-full rounded-lg"
          src="/images/generate-receipts.webp"
          alt="person recording donations"
          width={100}
          height={100}
        />
        <Image
          className="mt-4 w-full rounded-lg lg:mt-10"
          src="/images/sample-receipt.webp"
          alt="people volunteering"
          width={100}
          height={100}
        />
      </div>
    </div>
  </section>
)
export default Info

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<LayoutProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return { props: { session: null } satisfies LayoutProps }

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
