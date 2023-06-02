import { GetServerSideProps } from "next"
import { Session, getServerSession } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { user } from "@/lib/db"
import { Button, Card, Svg } from "@/components/ui"
import { MouseEventHandler, ReactNode } from "react"
import { putJsonData, subscribe } from "@/lib/util/request"
import Image from "next/image"
import { useRouter } from "next/router"
import { DataType } from "./api/stripe/update-subscription"

type Account = { country: string; name: string; logo: string; companyName: string }
type Subscription = {
  cancelAtPeriodEnd: boolean
  periodEnd: number
  createdAt: number
}
type Props =
  | { session: Session; subscribed: false }
  | {
      session: Session
      subscribed: true
      subscription: Subscription
      account: Account
    }

const Tick = () => (
  <div className="w-5 -mb-1 mr-4 inline-block text-green-300">
    <Svg.Tick />
  </div>
)
const Cross = () => (
  <div className="w-5 -mb-1 mr-4 inline-block text-red-300">
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
            className="flex space-x-3 line-through decoration-gray-500 text-base font-normal leading-tight text-gray-500"
          >
            <Cross />
            {nonFeature}
          </li>
        ))}
    </ul>
    {button && <Button onClick={button.onClick}>{button.inner}</Button>}
  </Card>
)

const msInDay = 1000 * 60 * 60 * 24
function getDaysBetweenDates(date1: Date, date2: Date) {
  // Calculate the time difference in milliseconds
  const timeDiff = Math.abs(date2.getTime() - date1.getTime())

  // Convert milliseconds to days
  const days = Math.ceil(timeDiff / msInDay)

  return days
}

function ProfileCard({
  account: { companyName, logo, name, country },
  subscription,
}: {
  account: Account
  subscription: Subscription
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
        <p className="font-normal leading-tight text-gray-500 dark:text-gray-400 text-sm">
          <div className="w-4 h-4 inline-block mr-2 mb-[-0.1rem] text-white">
            <Svg.Briefcase />
          </div>
          {companyName}
        </p>
        <p className="font-normal leading-tight text-gray-500 dark:text-gray-400 text-sm">
          <div className="w-4 h-4 inline-block mr-2 mb-[-0.1rem] text-white">
            <Svg.MapPin />
          </div>
          {country}
        </p>
      </div>
      <p className="font-normal leading-tight text-gray-500 dark:text-gray-400 text-sm">
        Subscribed since:{" "}
        <span className="text-gray-900 dark:text-white">{createdAt.toDateString()}</span>
      </p>
      <p className="font-normal leading-tight text-gray-500 dark:text-gray-400 text-sm">
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
export default function IndexPage(props: Props) {
  if (!props.subscribed)
    return (
      <section className="flex flex-row justify-center w-full h-full p-10">
        <div className="p-14 text-white border-r border-solid border-slate-700">
          <PricingCard
            title="Your selected plan"
            features={freeFeatures}
            nonFeatures={freeNonFeatures}
            price={0}
          />
        </div>
        <div className="p-14 text-white">
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
        </div>
      </section>
    )

  const { subscription, account } = props
  return (
    <section className="flex flex-row justify-center w-full h-full p-10">
      <div className="p-14 text-white border-r border-solid border-slate-700">
        <PricingCard title="Your selected plan" features={paidFeatures} price={20} />
      </div>
      <div className="p-14 text-white">
        <ProfileCard account={account} subscription={subscription} />
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

  const { subscription, donee, billingAddress } = data

  if (!subscription)
    return {
      props: {
        session,
        subscribed: false,
      },
    }

  return {
    props: {
      session,
      subscribed: true,
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
