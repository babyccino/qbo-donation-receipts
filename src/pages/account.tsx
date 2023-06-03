import { GetServerSideProps } from "next"
import { Session, getServerSession } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { user } from "@/lib/db"
import { Subscription } from "@/types/db"
import { Button, Card, Svg } from "@/components/ui"
import { MouseEventHandler, ReactNode } from "react"
import { putJsonData, subscribe } from "@/lib/util/request"
import Image from "next/image"
import { useRouter } from "next/router"
import { DataType } from "./api/stripe/update-subscription"
import { getDaysBetweenDates } from "@/lib/util/date"
import { isUserSubscribed } from "@/lib/stripe"

type Account = { country: string; name: string; logo: string; companyName: string }
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

const Tick = () => (
  <div className="-mb-1 mr-4 inline-block w-5 text-green-300">
    <Svg.Tick />
  </div>
)
const Cross = () => (
  <div className="-mb-1 mr-4 inline-block w-5 text-red-300">
    <Svg.Cross />
  </div>
)
const PricingCard = ({
  title,
  features,
  nonFeatures,
  price,
  button,
}: {
  title: string
  features: ReactNode[]
  nonFeatures?: ReactNode[]
  price: number
  button?: { inner: ReactNode; onClick?: MouseEventHandler<HTMLButtonElement> }
}) => (
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
          <Tick />
          {feature}
        </li>
      ))}
      {nonFeatures &&
        nonFeatures.map((nonFeature, idx) => (
          <li
            key={idx}
            className="flex space-x-3 text-base font-normal leading-tight text-gray-500 line-through decoration-gray-500"
          >
            <Cross />
            {nonFeature}
          </li>
        ))}
    </ul>
    {button && <Button onClick={button.onClick}>{button.inner}</Button>}
  </Card>
)

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
      <Image
        src={logo}
        alt={`${companyName}'s logo`}
        height={50}
        width={50}
        className="rounded-md"
      />
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
          features={subscribed ? paidFeatures : freeFeatures}
          nonFeatures={subscribed ? undefined : freeNonFeatures}
          price={subscribed ? 20 : 0}
        />
      </div>
      <div className="pt-8 text-white sm:p-14">
        {subscribed ? (
          <ProfileCard account={props.account} subscription={props.subscription} />
        ) : (
          <PricingCard
            title="Pro plan"
            features={paidFeatures}
            price={20}
            button={{
              inner: "Choose plan",
              onClick: e => {
                e.preventDefault()
                subscribe("/account")
              },
            }}
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
        logo: donee?.smallLogo as string,
        name: billingAddress?.name as string,
      },
    },
  }
}
