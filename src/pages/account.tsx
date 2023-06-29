import { GetServerSideProps } from "next"
import Image from "next/image"
import { useRouter } from "next/router"
import { getServerSession, Session } from "next-auth"
import { Button, Card } from "flowbite-react"

import { authOptions } from "./api/auth/[...nextauth]"
import { user } from "@/lib/db"
import { Subscription } from "@/types/db"
import { PricingCard, Svg } from "@/components/ui"
import { putJsonData, subscribe } from "@/lib/util/request"
import { DataType } from "./api/stripe/update-subscription"
import { getDaysBetweenDates } from "@/lib/util/date"
import { isUserSubscribed } from "@/lib/stripe"

type Account = { country: string; name: string; logo: string | null; companyName: string }
type PropsSubscription = {
  cancelAtPeriodEnd: boolean
  periodEnd: number
  createdAt: number
}
type Props =
  | { session: Session; subscribed: false }
  | {
      session: Session
      subscribed: true
      subscription: PropsSubscription
      account: Account
    }

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })

function ProfileCard({
  account: { companyName, logo, name, country },
  subscription,
}: {
  account: Account
  subscription: PropsSubscription
}) {
  const router = useRouter()

  const createdAt = new Date(subscription.createdAt)
  const periodEnd = new Date(subscription.periodEnd)
  const { cancelAtPeriodEnd } = subscription

  const daysLeft = getDaysBetweenDates(new Date(), periodEnd)

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
        <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
          <div className="mb-[-0.1rem] mr-2 inline-block h-4 w-4 text-white">
            <Svg.Briefcase />
          </div>
          {companyName}
        </p>
        <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
          <div className="mb-[-0.1rem] mr-2 inline-block h-4 w-4 text-white">
            <Svg.MapPin />
          </div>
          {country}
        </p>
      </div>
      <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
        Subscribed since:{" "}
        <span className="text-gray-900 dark:text-white">{formatDate(createdAt)}</span>
      </p>
      <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
        Your subscription will {cancelAtPeriodEnd ? "end" : "automatically renew"} in{" "}
        <span className="text-gray-900 dark:text-white">{daysLeft}</span> days
      </p>
      <Button
        color={cancelAtPeriodEnd ? undefined : "light"}
        className="flex-shrink"
        onClick={async () => {
          const data: DataType = { cancelAtPeriodEnd: !cancelAtPeriodEnd }
          await putJsonData("/api/stripe/update-subscription", data)
          router.push(router.asPath)
        }}
      >
        {cancelAtPeriodEnd ? "Resubscribe" : "Unsubscribe"}
      </Button>
    </Card>
  )
}

export default function AccountPage(props: Props) {
  const { subscribed } = props
  return (
    <section className="flex min-h-screen flex-col p-4 sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard title="Your selected plan" plan={subscribed ? "pro" : "free"} />
      </div>
      <div className="pt-8 text-white sm:p-14">
        {subscribed ? (
          <ProfileCard account={props.account} subscription={props.subscription} />
        ) : (
          <PricingCard
            plan="pro"
            button={
              <Button
                onClick={e => {
                  e.preventDefault()
                  subscribe("/account")
                }}
              >
                Choose plan
              </Button>
            }
          />
        )}
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

  const data = (await user.doc(session.user.id).get()).data()
  if (!data) throw new Error("User signed in but was not found in db")

  const subscribed = isUserSubscribed(data)
  if (!subscribed)
    return {
      props: {
        session,
        subscribed,
      },
    }

  const { donee, billingAddress } = data
  // if isUserSubscribed returns true then subscription can not be undefined
  const subscription = data.subscription as Subscription

  return {
    props: {
      session,
      subscribed,
      subscription: {
        cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
        periodEnd: subscription.currentPeriodEnd.getTime(),
        createdAt: subscription.created.getTime(),
      },
      account: {
        country: donee?.country as string,
        companyName: donee?.companyName as string,
        logo: donee?.smallLogo ?? null,
        name: billingAddress?.name as string,
      },
    },
  }
}
