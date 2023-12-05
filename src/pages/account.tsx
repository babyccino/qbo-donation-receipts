import { BriefcaseIcon, MapPinIcon } from "@heroicons/react/24/solid"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { Button, Card } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session, getServerSession } from "next-auth"
import { signIn } from "next-auth/react"
import { ApiError } from "next/dist/server/api-utils"
import Image from "next/image"
import { useRouter } from "next/router"
import { useMemo } from "react"

import { LayoutProps } from "@/components/layout"
import { Connect } from "@/components/qbo"
import { PricingCard } from "@/components/ui"
import { signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { getImageUrl } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { isUserSubscribed } from "@/lib/stripe"
import { getDaysBetweenDates } from "@/lib/util/date"
import { SerialiseDates, deSerialiseDates, serialiseDates } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { postJsonData, putJsonData, subscribe } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { DisconnectBody } from "@/pages/api/auth/disconnect"
import { DataType } from "@/pages/api/stripe/update-subscription"
import { Subscription as DbSubscription, accounts, sessions, users } from "db/schema"

type Subscription = Pick<
  DbSubscription,
  "status" | "cancelAtPeriodEnd" | "currentPeriodEnd" | "createdAt"
>
type Props = ({
  session: Session
  name: string
  smallLogo: string | null
  companyName: string | null
  connected: boolean
  realmId: string | null
} & (
  | { subscribed: false }
  | {
      subscribed: true
      subscription: Subscription
    }
)) &
  LayoutProps
type SerialisedProps = SerialiseDates<Props>

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })

function ProfileCard({
  companyName,
  smallLogo,
  name,
  subscription,
  connected,
  realmId,
  session,
}: {
  name: string
  smallLogo: string | null
  companyName: string | null
  subscription?: Subscription
  connected: boolean
  realmId: string | null
  session: Session
}) {
  const router = useRouter()

  if (!session) throw new Error("User accessed account page while not signed in")

  return (
    <Card className="w-72">
      <Show when={Boolean(smallLogo)}>
        <Image
          src={smallLogo as string}
          alt={`${companyName}'s logo`}
          height={50}
          width={50}
          className="rounded-md"
        />
      </Show>
      <h5 className="text-xl font-medium text-gray-500 dark:text-white">{name}</h5>
      <div className="space-y-1">
        <Show when={Boolean(companyName)}>
          <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
            <div className="mb-[-0.1rem] mr-2 inline-block h-4 w-4 text-white">
              <BriefcaseIcon />
            </div>
            {companyName}
          </p>
        </Show>
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
            Your subscription will {subscription!.cancelAtPeriodEnd ? "end" : "automatically renew"}{" "}
            in{" "}
            <span className="text-gray-900 dark:text-white">
              {getDaysBetweenDates(new Date(), new Date(subscription.currentPeriodEnd))}
            </span>{" "}
            days
          </p>
          <Button
            color={subscription!.cancelAtPeriodEnd ? undefined : "light"}
            className="flex-shrink"
            onClick={async e => {
              e.preventDefault()
              const data: DataType = { cancelAtPeriodEnd: !subscription!.cancelAtPeriodEnd }
              await putJsonData("/api/stripe/update-subscription", data)
              router.push(router.asPath)
            }}
          >
            {subscription!.cancelAtPeriodEnd ? "Resubscribe" : "Unsubscribe"}
          </Button>
        </>
      )}
      {connected ? (
        <Button
          color="light"
          className="flex-shrink"
          onClick={async () => {
            const body: DisconnectBody = { redirect: false }
            const res = await postJsonData(
              `/api/auth/disconnect?revoke=true${realmId ? `&realmId=${realmId}` : ""}`,
              body,
            )
            router.push("/auth/disconnected")
            // router.push(res.redirect)
          }}
        >
          Disconnect
        </Button>
      ) : (
        <button className="flex-shrink self-center" onClick={e => void signIn("QBO")}>
          <Connect />
        </button>
      )}
    </Card>
  )
}

// --- page ---

export default function AccountPage(serialisedProps: SerialisedProps) {
  const props = useMemo(() => deSerialiseDates(serialisedProps), [serialisedProps])
  const { subscribed, connected, name, companyName, smallLogo, realmId, session } = props
  return (
    <section className="flex min-h-screen flex-col p-4 sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard
          title="Your selected plan"
          plan={subscribed ? "pro" : "free"}
          button={
            !subscribed ? (
              <Button
                onClick={e => {
                  e.preventDefault()
                  subscribe("/account")
                }}
              >
                Go pro
              </Button>
            ) : undefined
          }
        />
      </div>
      <div className="pt-8 text-white sm:p-14">
        <ProfileCard
          companyName={companyName}
          smallLogo={smallLogo}
          name={name}
          subscription={subscribed ? props.subscription : undefined}
          connected={connected}
          realmId={realmId}
          session={session}
        />
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("account")

  const [user, accountList] = await Promise.all([
    db.query.users.findFirst({
      // if the realmId is specified get that account otherwise just get the first account for the user
      where: eq(users, session.user.id),
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
    }),
    db.query.accounts.findMany({
      columns: { companyName: true, id: true },
      where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
      orderBy: desc(accounts.updatedAt),
    }) as Promise<{ companyName: string; id: string }[]>,
  ])
  if (!user) throw new ApiError(500, "user not found in db")
  let account = user.accounts?.[0] as (typeof user.accounts)[number] | undefined
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

  // if (!subscribed)
  if (subscription && isUserSubscribed(subscription)) {
    return {
      props: serialiseDates({
        session,
        subscribed: true,
        subscription,
        companyName: doneeInfo?.companyName ?? null,
        smallLogo: doneeInfo?.smallLogo ? getImageUrl(doneeInfo.smallLogo) : null,
        name: billingAddress?.name ?? user.name ?? "",
        connected,
        realmId: realmId,
        companies: accountList,
        selectedAccountId: account?.id ?? null,
      } satisfies Props),
    }
  }
  return {
    props: {
      session,
      subscribed: false,
      companyName: doneeInfo?.companyName ?? null,
      smallLogo: doneeInfo?.smallLogo ? getImageUrl(doneeInfo.smallLogo) : null,
      name: billingAddress?.name ?? user.name ?? "",
      connected,
      realmId,
      companies: accountList,
      selectedAccountId: account?.id ?? null,
    } satisfies SerialisedProps,
  }
}
