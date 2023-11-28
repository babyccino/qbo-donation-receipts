import { BriefcaseIcon, MapPinIcon } from "@heroicons/react/24/solid"
import { eq } from "drizzle-orm"
import { Button, Card } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session } from "next-auth"
import { signIn, useSession } from "next-auth/react"
import { ApiError } from "next/dist/server/api-utils"
import Image from "next/image"
import { useRouter } from "next/router"

import { Connect } from "@/components/qbo"
import { PricingCard } from "@/components/ui"
import { getServerSessionOrThrow } from "@/lib/auth/next-auth-helper-server"
import { getImageUrl } from "@/lib/db-helper"
import { db } from "@/lib/db/test"
import { isUserSubscribed } from "@/lib/stripe"
import { getDaysBetweenDates } from "@/lib/util/date"
import { Show } from "@/lib/util/react"
import { postJsonData, putJsonData, subscribe } from "@/lib/util/request"
import { DisconnectBody } from "@/pages/api/auth/disconnect"
import { DataType } from "@/pages/api/stripe/update-subscription"
import { Subscription as DbSubscription, accounts, users } from "db/schema"

type Subscription = Pick<
  DbSubscription,
  "status" | "cancelAtPeriodEnd" | "currentPeriodEnd" | "createdAt"
>
type Props = {
  session: Session
  name: string
  smallLogo: string | null
  companyName: string | null
  connected: boolean
  realmId: string
} & (
  | { subscribed: false }
  | {
      subscribed: true
      subscription: Subscription
    }
)

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })

function ProfileCard({
  companyName,
  smallLogo,
  name,
  subscription,
  connected,
  realmId,
}: {
  name: string
  smallLogo: string | null
  companyName: string | null
  subscription?: Subscription
  connected: boolean
  realmId: string
}) {
  const router = useRouter()
  const { data: session } = useSession()

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
              `/api/auth/disconnect?revoke=true&realmId=${realmId}`,
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

export default function AccountPage(props: Props) {
  const { subscribed, connected, name, companyName, smallLogo, realmId } = props
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
        />
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, query }) => {
  const session = await getServerSessionOrThrow(req, res)

  const queryRealmId = typeof query.realmid === "string" ? query.realmid : undefined

  const eqUserId = eq(users.id, session.user.id)
  const user = await db.query.users.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: eq(users.id, session.user.id),
    with: {
      accounts: {
        where: queryRealmId ? eq(accounts.realmId, queryRealmId) : undefined,
        columns: {
          scope: true,
          realmId: true,
        },
        with: {
          doneeInfo: { columns: { companyName: true, smallLogo: true } },
        },
      },
      billingAddress: { columns: { name: true } },
      subscription: {
        columns: { cancelAtPeriodEnd: true, status: true, createdAt: true, currentPeriodEnd: true },
      },
    },
  })
  const account = user?.accounts.at(0)
  if (!user || !account)
    throw new ApiError(500, "account for given user and company realmId not found in db")
  const { billingAddress, subscription } = user
  const { doneeInfo } = account
  const connected = account.scope === "accounting"
  const realmId = account.realmId ?? queryRealmId
  if (!realmId) throw new ApiError(500, "realmId not provided by either client or db")

  // if (!subscribed)
  if (subscription && isUserSubscribed(subscription)) {
    return {
      props: {
        session,
        subscribed: true,
        subscription,
        companyName: doneeInfo?.companyName ?? null,
        smallLogo: doneeInfo?.smallLogo ? getImageUrl(doneeInfo.smallLogo) : null,
        name: billingAddress?.name ?? user.name ?? "",
        connected,
        realmId,
      } satisfies Props,
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
    } satisfies Props,
  }
}
