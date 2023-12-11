import checksum from "checksum"
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { redirect } from "next/navigation"

import { MissingData } from "@/components/ui"
import { refreshTokenIfStale } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { accounts, donations as donationsSchema, emailHistories, sessions, users } from "db/schema"
import { getServerSession } from "../auth-util"
import { CompleteAccountEmail, EmailInput } from "./client"

enum RecipientStatus {
  Valid = 0,
  NoEmail,
}

export default async function Email() {
  const session = await getServerSession()
  if (!session) return redirect("/auth/signin?callback=/email")

  const user = await db.query.users.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: eq(users.id, session.user.id),
    columns: { name: true },
    with: {
      accounts: {
        where: session.accountId
          ? eq(accounts.id, session.accountId)
          : eq(accounts.scope, "accounting"),
        orderBy: desc(accounts.updatedAt),
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
            columns: { accountId: false, createdAt: false, id: false, updatedAt: false },
          },
          userData: { columns: { items: true, startDate: true, endDate: true } },
        },
      },
      billingAddress: { columns: { name: true } },
      subscription: {
        columns: {
          cancelAtPeriodEnd: true,
          status: true,
          createdAt: true,
          currentPeriodEnd: true,
        },
      },
    },
  })
  if (!user) throw new ApiError(500, "user not found in db")
  let account = user.accounts?.[0] as (typeof user.accounts)[number] | undefined
  if (session.accountId && !account)
    throw new ApiError(500, "account for given user and session not found in db")

  if (!account || account.scope !== "accounting" || !account.accessToken)
    return redirect("/auth/disconnected")

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
    return redirect("/auth/disconnected")

  if (!user.subscription || !isUserSubscribed(user.subscription))
    return { redirect: { permanent: false, destination: "subscribe" } }

  const { doneeInfo, userData } = account
  if (!doneeInfo || !userData) {
    const filledIn = { doneeDetails: Boolean(doneeInfo), items: Boolean(userData) }

    return (
      <section className="flex h-full flex-col justify-center gap-4 p-8 align-middle">
        <MissingData filledIn={filledIn} />
        <form>
          <EmailInput />
        </form>
      </section>
    )
  }

  await refreshTokenIfStale(account)

  const donations = await getDonations(
    account.accessToken,
    account.realmId,
    { startDate: userData.startDate, endDate: userData.endDate },
    userData.items ? userData.items.split(",") : [],
  )
  const possibleRecipients = donations.map(({ donorId, name, email }) => ({
    donorId,
    name,
    status: email ? RecipientStatus.Valid : RecipientStatus.NoEmail,
  }))
  const recipientIds = possibleRecipients.map(({ donorId }) => donorId)

  const emailHistory = (
    await db.query.emailHistories.findMany({
      columns: {
        createdAt: true,
        startDate: true,
        endDate: true,
      },
      where: and(
        lt(emailHistories.startDate, userData.endDate),
        gt(emailHistories.endDate, userData.startDate),
      ),
      with: {
        donations: {
          columns: { name: true, donorId: true },
          where: inArray(donationsSchema.donorId, recipientIds),
        },
      },
    })
  ).filter(item => item.donations.length > 0)

  return (
    <CompleteAccountEmail
      checksum={checksum(JSON.stringify(donations))}
      donee={doneeInfo}
      emailHistory={emailHistory}
      possibleRecipients={possibleRecipients}
    />
  )
}
