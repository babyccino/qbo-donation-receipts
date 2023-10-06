import { BriefcaseIcon, MapPinIcon } from "@heroicons/react/24/solid"
import { Button, Card } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session } from "next-auth"
import { signIn, useSession } from "next-auth/react"
import Image from "next/image"
import { useRouter } from "next/router"

import { Connect } from "@/components/qbo"
import { PricingCard } from "@/components/ui"
import { getUserData } from "@/lib/db"
import { getImageUrl } from "@/lib/db-helper"
import { isUserSubscribed } from "@/lib/stripe"
import { getDaysBetweenDates } from "@/lib/util/date"
import { isSessionQboConnected } from "@/lib/util/next-auth-helper"
import { getServerSessionOrThrow } from "@/lib/util/next-auth-helper-server"
import { Show } from "@/lib/util/react"
import { postJsonData, putJsonData, subscribe } from "@/lib/util/request"
import { DisconnectBody } from "@/pages/api/auth/disconnect"
import { DataType } from "@/pages/api/stripe/update-subscription"

type Account = { name: string; logo: string | null; companyName: string | null }
type PropsSubscription = {
  cancelAtPeriodEnd: boolean
  periodEnd: number
  createdAt: number
}
type Props =
  | { session: Session; subscribed: false; account: Account }
  | {
      session: Session
      subscribed: true
      subscription: PropsSubscription
      account: Account
    }

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })

function ProfileCard({
  account: { companyName, logo, name },
  subscription,
}: {
  account: Account
  subscription?: PropsSubscription
}) {
  const router = useRouter()
  const { data: session } = useSession()

  if (!session) throw new Error("User accessed account page while not signed in")

  return (
    <Card className="w-72">
      <Show when={Boolean(logo)}>
        <Image
          src={logo as string}
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
              {formatDate(new Date(subscription!.createdAt))}
            </span>
          </p>
          <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
            Your subscription will {subscription!.cancelAtPeriodEnd ? "end" : "automatically renew"}{" "}
            in{" "}
            <span className="text-gray-900 dark:text-white">
              {getDaysBetweenDates(new Date(), new Date(subscription!.periodEnd))}
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
      {isSessionQboConnected(session) ? (
        <Button
          color="light"
          className="flex-shrink"
          onClick={async () => {
            const body: DisconnectBody = { redirect: false }
            const res = await postJsonData("/api/auth/disconnect?revoke=true", body)
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
  const { subscribed } = props
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
          account={props.account}
          subscription={subscribed ? props.subscription : undefined}
        />
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSessionOrThrow(req, res)

  const user = await getUserData(session.user.id)
  const subscribed = isUserSubscribed(user)
  const { billingAddress, donee } = user
  const account = {
    companyName: donee?.companyName ?? null,
    logo: donee?.smallLogo ? getImageUrl(donee.smallLogo) : null,
    name: billingAddress?.name ?? user.name,
  }
  if (!subscribed)
    return {
      props: {
        session,
        subscribed,
        account,
      },
    }

  const { subscription } = user
  return {
    props: {
      session,
      subscribed,
      subscription: {
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
        periodEnd: subscription.currentPeriodEnd.getTime(),
        createdAt: subscription.created.getTime(),
      },
      account,
    },
  }
}
