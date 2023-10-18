import { BriefcaseIcon, MapPinIcon } from "@heroicons/react/24/solid"
import { Card } from "flowbite-react"
import { ApiError } from "next/dist/server/api-utils"
import Image from "next/image"
import NextLink from "next/link"
import { redirect } from "next/navigation"
import { twMerge } from "tailwind-merge"

import { getServerSessionOrThrow } from "@/app/auth-util"
import { Link, buttonStyling, buttonStylingLight } from "@/components/link"
import { PricingCard } from "@/components/ui"
import { getUserData } from "@/lib/db"
import { getImageUrl } from "@/lib/db-helper"
import { isUserSubscribed, manageSubscriptionStatusChange, stripe } from "@/lib/stripe"
import { getDaysBetweenDates } from "@/lib/util/date"
import { isSessionQboConnected } from "@/lib/util/next-auth-helper"
import { Show } from "@/lib/util/react"
import { Subscription } from "@/types/db"

import QBOConnectDefault from "@/public/svg/qbo/qbo-connect-default.svg"

type Account = { name: string; logo: string | null; companyName: string | null }

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })

async function ProfileCard({
  account: { companyName, logo, name },
  subscription,
}: {
  account: Account
  subscription?: Subscription
}) {
  const session = await getServerSessionOrThrow()
  if (!session) throw new Error()
  const connected = isSessionQboConnected(session)

  async function updateSubscription(formData: FormData) {
    "use server"

    if (!subscription) throw new ApiError(500, "User is not subscribed")

    const stripeSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: !subscription!.cancelAtPeriodEnd,
    })
    manageSubscriptionStatusChange(stripeSubscription)

    redirect("/account")
  }

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
              {formatDate(subscription.created)}
            </span>
          </p>
          <p className="text-sm font-normal leading-tight text-gray-500 dark:text-gray-400">
            Your subscription will {subscription!.cancelAtPeriodEnd ? "end" : "automatically renew"}{" "}
            in{" "}
            <span className="text-gray-900 dark:text-white">
              {getDaysBetweenDates(new Date(), subscription!.currentPeriodEnd)}
            </span>{" "}
            days
          </p>
          <form action={updateSubscription}>
            <button
              color={subscription!.cancelAtPeriodEnd ? undefined : "light"}
              className={twMerge(
                subscription!.cancelAtPeriodEnd ? buttonStyling : buttonStylingLight,
                "w-full",
              )}
              type="submit"
            >
              {subscription!.cancelAtPeriodEnd ? "Resubscribe" : "Unsubscribe"}
            </button>
          </form>
        </>
      )}
      <form className="flex justify-center">
        {connected ? (
          <Link light className="text-center w-full" href="/api/auth/disconnect?revoke=true">
            Disconnect
          </Link>
        ) : (
          <NextLink href="/api/auth/connect" className="block hover:brightness-75 filter">
            <QBOConnectDefault />
          </NextLink>
        )}
      </form>
    </Card>
  )
}

export default async function AccountPage() {
  const session = await getServerSessionOrThrow()

  const user = await getUserData(session.user.id)
  const subscribed = isUserSubscribed(user)

  const account = {
    companyName: user.donee?.companyName ?? null,
    logo: user.donee?.smallLogo ? getImageUrl(user.donee.smallLogo) : null,
    name: user.billingAddress?.name ?? user.name,
  }

  return (
    <section className="flex min-h-screen flex-col p-4 sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard
          title="Your selected plan"
          plan={subscribed ? "pro" : "free"}
          button={
            !subscribed ? <Link href="/api/stripe/create-checkout-session">Go pro</Link> : undefined
          }
        />
      </div>
      <div className="pt-8 text-white sm:p-14">
        <ProfileCard account={account} subscription={user.subscription} />
      </div>
    </section>
  )
}
