import { LayoutProps } from "@/components/layout"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { captureException } from "@sentry/nextjs"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { db } from "../db"
import { accounts, sessions } from "db/schema"
import { and, eq, isNotNull } from "drizzle-orm"

export function interceptGetServerSidePropsErrors<T extends GetServerSideProps<any>>(
  getServerSideProps: T,
) {
  return async (ctx: any) => {
    try {
      return await getServerSideProps(ctx)
    } catch (error: any) {
      console.error("Error in getServerSideProps: ", error)
      captureException(error)
      const serialisedError: any = {}
      if (error.message) serialisedError.message = error.message
      if (error.stack) serialisedError.stack = error.stack
      if (error.statusCode) serialisedError.statusCode = error.statusCode
      return { props: { error: serialisedError } }
    }
  }
}
const _defaultGetServerSideProps: GetServerSideProps<LayoutProps> = async ({ req, res }) => {
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

export const defaultGetServerSideProps = interceptGetServerSidePropsErrors(
  _defaultGetServerSideProps,
)
