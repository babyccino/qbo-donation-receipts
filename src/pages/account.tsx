import { ReactNode } from "react"
import { GetServerSideProps } from "next"
import Image from "next/image"
import { useRouter } from "next/router"
import { getServerSession, Session } from "next-auth"
import { signIn, useSession } from "next-auth/react"
import { Button, Card } from "flowbite-react"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { getImageUrl, getUserData } from "@/lib/db"
import { Subscription } from "@/types/db"
import { Svg } from "@/components/ui"
import { postJsonData, putJsonData, subscribe } from "@/lib/util/request"
import { DataType } from "@/pages/api/stripe/update-subscription"
import { getDaysBetweenDates } from "@/lib/util/date"
import { isUserSubscribed } from "@/lib/stripe"
import { Connect } from "@/components/qbo"
import { DisconnectBody } from "@/pages/api/auth/disconnect"
import { isSessionQboConnected } from "@/lib/util/next-auth-helper"

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

function PricingCard({
  plan,
  title: propsTitle,
  button,
}: {
  plan: "pro" | "free"
  title?: string
  button?: ReactNode
}) {
  const isPro = plan === "pro"
  const features = isPro ? paidFeatures : freeFeatures
  const price = isPro ? 20 : 0

  const title = propsTitle ?? (isPro ? "Pro Plan" : "Free Plan")

  return (
    <Card>
      <h5 className="mb-4 text-xl font-medium text-gray-500 dark:text-gray-400">{title}</h5>
      <div className="flex items-baseline text-gray-900 dark:text-white">
        <span className="text-3xl font-semibold">CAD</span>
        <span className="text-5xl font-extrabold tracking-tight">{price}</span>
        <span className="ml-1 text-xl font-normal text-gray-500 dark:text-gray-400">/year</span>
      </div>
      <ul className="my-7 space-y-5">
        {features.map((feature, idx) => (
          <li
            key={idx}
            className="flex space-x-3 text-base font-normal leading-tight text-gray-500 dark:text-gray-400"
          >
            <div className="-mb-1 mr-4 inline-block w-5 text-green-300">
              <Svg.Tick />
            </div>
            {feature}
          </li>
        ))}
        {!isPro &&
          freeNonFeatures.map((nonFeature, idx) => (
            <li
              key={idx}
              className="flex space-x-3 text-base font-normal leading-tight text-gray-500 line-through decoration-gray-500"
            >
              <div className="-mb-1 mr-4 inline-block w-5 text-red-300">
                <Svg.Cross />
              </div>
              {nonFeature}
            </li>
          ))}
      </ul>
      {button}
    </Card>
  )
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
      {logo && (
        <Image
          src={logo}
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
              <Svg.Briefcase />
            </div>
            {companyName}
          </p>
        )}
        <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
          <div className="mb-[-0.1rem] mr-2 inline-block h-4 w-4 text-white">
            <Svg.MapPin />
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
              {getDaysBetweenDates(new Date(), new Date(subscription.periodEnd))}
            </span>{" "}
            days
          </p>
          <Button
            color={subscription.cancelAtPeriodEnd ? undefined : "light"}
            className="flex-shrink"
            onClick={async e => {
              e.preventDefault()
              const data: DataType = { cancelAtPeriodEnd: !subscription.cancelAtPeriodEnd }
              await putJsonData("/api/stripe/update-subscription", data)
              router.push(router.asPath)
            }}
          >
            {subscription.cancelAtPeriodEnd ? "Resubscribe" : "Unsubscribe"}
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

const freeFeatures = ["Individual configuration", "No setup, or hidden fees", "3 free receipts"]
const freeNonFeatures = ["Unlimited receipts", "Automatic emailing"]

const paidFeatures = [
  "Individual configuration",
  "No setup, or hidden fees",
  "Unlimited receipts",
  "Automatic emailing",
]
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
  const session = await getServerSession(req, res, authOptions)

  if (!session)
    return {
      redirect: {
        destination: "/api/auth/signin",
        permanent: false,
      },
    }

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
  // if isUserSubscribed returns true then subscription can not be undefined
  const subscription = user.subscription as Subscription

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
