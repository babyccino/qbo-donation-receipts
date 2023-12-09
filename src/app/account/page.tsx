import { BriefcaseIcon, MapPinIcon } from "@heroicons/react/24/solid"
import { and, desc, eq } from "drizzle-orm"
import { Button, Card } from "flowbite-react"
import { ApiError } from "next/dist/server/api-utils"
import Image from "next/image"
import NextLink from "next/link"
import { redirect } from "next/navigation"

import { getServerSession, getServerSessionOrThrow } from "@/app/auth-util"
import { Link as StyledLink } from "@/components/link"
import { Connect } from "@/components/qbo"
import { PricingCard } from "@/components/ui"
import { revokeAccessToken } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { getImageUrl } from "@/lib/db/db-helper"
import { manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import { getDaysBetweenDates } from "@/lib/util/date"
import { Subscription as DbSubscription, accounts, sessions, subscriptions, users } from "db/schema"

type Subscription = Pick<
  DbSubscription,
  "status" | "cancelAtPeriodEnd" | "currentPeriodEnd" | "createdAt"
>

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })

type Account = {
  name: string
  smallLogo: string | null
  companyName: string | null
  realmId: string | null
}
async function ProfileCard({
  account: { companyName, smallLogo, name, realmId },
  subscription,
  connected,
}: {
  account: Account
  subscription?: Subscription | null
  connected: boolean
}) {
  const manageSubChangeAction = async () => {
    "use server"
    const session = await getServerSessionOrThrow()

    const currentSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
      columns: { id: true, cancelAtPeriodEnd: true },
    })
    if (!currentSubscription) throw new ApiError(500, "User has no subscription")

    const stripeSubscription = await stripe.subscriptions.update(currentSubscription.id, {
      cancel_at_period_end: !currentSubscription?.cancelAtPeriodEnd,
    })
    manageSubscriptionStatusChange(stripeSubscription)

    redirect("/account")
  }

  const disconnectAction = async () => {
    "use server"
    const session = await getServerSessionOrThrow()

    if (!session.accountId)
      throw new ApiError(500, "realmId not provided in query params or session")

    const account = await db.query.accounts.findFirst({
      columns: { realmId: true, accessToken: true },
      where: and(eq(accounts.id, session.accountId), eq(accounts.userId, session.user.id)),
    })
    if (!account?.realmId || !account.accessToken)
      throw new ApiError(500, "session's account does not have a company to disconnect")
    const a = account.realmId

    await Promise.all([
      db
        .update(accounts)
        .set({
          accessToken: null,
          expiresAt: null,
          refreshToken: null,
          refreshTokenExpiresAt: null,
          scope: "profile",
        })
        .where(and(eq(accounts.realmId, realmId as string), eq(accounts.userId, session.user.id))),
      // the caller can specify whether or not they want their access token to be disconnected
      // this is because if the user has been disconnected from within QBO then they will have
      // already revoked their tokens
      // if the user is disconnecting from within the application the tokens will need to be
      // revoked by us
      revokeAccessToken(account.accessToken),
    ])

    redirect("/auth/disconnected")
  }

  return (
    <Card className="w-72">
      {smallLogo && (
        <Image
          src={smallLogo}
          alt={`${companyName}'s logo`}
          height={50}
          width={50}
          className="rounded-md"
        />
      )}
      <h5 className="text-xl font-medium text-gray-500 dark:text-white">{name}</h5>
      <div className="space-y-1">
        {companyName && (
          <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
            <div className="mb-[-0.1rem] mr-2 inline-block h-4 w-4 text-white">
              <BriefcaseIcon />
            </div>
            {companyName}
          </p>
        )}
        <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
          <div className="mb-[-0.1rem] mr-2 inline-block h-4 w-4 text-white">
            <MapPinIcon />
          </div>
          CA
        </p>
      </div>
      {subscription && (
        <>
          <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
            Subscribed since:{" "}
            <span className="text-gray-900 dark:text-white">
              {formatDate(new Date(subscription.createdAt))}
            </span>
          </p>
          <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
            Your subscription will {subscription.cancelAtPeriodEnd ? "end" : "automatically renew"}{" "}
            in{" "}
            <span className="text-gray-900 dark:text-white">
              {getDaysBetweenDates(new Date(), new Date(subscription.currentPeriodEnd))}
            </span>{" "}
            days
          </p>
          <Button
            color={subscription.cancelAtPeriodEnd ? undefined : "light"}
            className="flex-shrink"
            formAction={manageSubChangeAction}
          >
            {subscription.cancelAtPeriodEnd ? "Resubscribe" : "Unsubscribe"}
          </Button>
        </>
      )}
      {connected ? (
        <Button color="light" className="flex-shrink" formAction={disconnectAction}>
          Disconnect
        </Button>
      ) : (
        <NextLink className="flex-shrink self-center" href="/api/auth/connect">
          <Connect />
        </NextLink>
      )}
    </Card>
  )
}

// --- page ---

export default async function AccountPage() {
  const session = await getServerSession()
  if (!session) return redirect("/auth/signin?callback=/account")

  const user = await db.query.users.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: eq(users.id, session.user.id),
    columns: { name: true },
    with: {
      accounts: {
        where: session.accountId
          ? eq(accounts.id, session.accountId)
          : eq(accounts.scope, "accounting"),
        columns: {
          id: true,
          scope: true,
          realmId: true,
        },
        with: {
          doneeInfo: { columns: { companyName: true, smallLogo: true } },
        },
        orderBy: desc(accounts.updatedAt),
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
  const account = user.accounts?.[0] as (typeof user.accounts)[number] | undefined
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

  const { billingAddress, subscription } = user
  const doneeInfo = account?.doneeInfo
  const connected = account?.scope === "accounting"
  const realmId = account?.realmId ?? null
  const subscribed = Boolean(subscription)
  const companyName = doneeInfo?.companyName ?? null
  const smallLogo = doneeInfo?.smallLogo ? getImageUrl(doneeInfo.smallLogo) : null
  const name = billingAddress?.name ?? user.name ?? ""

  return (
    <section className="flex min-h-screen flex-col p-4 sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard
          title="Your selected plan"
          plan={subscribed ? "pro" : "free"}
          button={
            !subscribed ? (
              <StyledLink href="/api/stripe/create-checkout-session">Go pro</StyledLink>
            ) : undefined
          }
        />
      </div>
      <div className="pt-8 text-white sm:p-14">
        <ProfileCard
          account={{ name, smallLogo, companyName, realmId }}
          subscription={subscription}
          connected={connected}
        />
      </div>
    </section>
  )
}
