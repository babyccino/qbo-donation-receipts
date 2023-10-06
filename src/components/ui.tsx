// svg from heroicons.dev
// hand drawn arrows from svgrepo.com
import { CheckIcon, EnvelopeIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { Card, Toast } from "flowbite-react"
import { ToastToggleProps } from "flowbite-react/lib/esm/components/Toast/ToastToggle"
import NextLink from "next/link"
import { ComponentProps, ReactNode } from "react"
import { twMerge } from "tailwind-merge"

import { Show } from "@/lib/util/react"

export const buttonStyling =
  "text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800"

export const Link = (props: ComponentProps<typeof NextLink>) => (
  <NextLink {...props} className={twMerge(props.className, buttonStyling)}></NextLink>
)

export const MissingData = ({
  filledIn,
}: {
  filledIn: { items: boolean; doneeDetails: boolean }
}) => (
  <div className="mx-auto flex flex-col gap-4 rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-8">
    <span className="col-span-full font-medium text-gray-900 dark:text-white">
      Some information necessary to generate your receipts is missing
    </span>
    <div className="flex justify-evenly gap-3">
      <Show when={!filledIn.items}>
        <Link className={buttonStyling} href="/items">
          Fill in Qualifying Sales Items
        </Link>
      </Show>
      <Show when={!filledIn.doneeDetails}>
        <Link className={buttonStyling} href="/details">
          Fill in Donee Details
        </Link>
      </Show>
    </div>
  </div>
)

const freeFeatures = ["Individual configuration", "No setup, or hidden fees", "3 free receipts"]
const freeNonFeatures = ["Unlimited receipts", "Automatic emailing"]
const paidFeatures = [
  "Individual configuration",
  "No setup, or hidden fees",
  "Unlimited receipts",
  "Automatic emailing",
]
export function PricingCard({
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
            <CheckIcon className="-mb-1 mr-4 inline-block w-5 text-green-300" />
            {feature}
          </li>
        ))}
        {!isPro &&
          freeNonFeatures.map((nonFeature, idx) => (
            <li
              key={idx}
              className="flex space-x-3 text-base font-normal leading-tight text-gray-500 line-through decoration-gray-500"
            >
              <XMarkIcon className="-mb-1 mr-4 inline-block w-5 text-red-300" />
              {nonFeature}
            </li>
          ))}
      </ul>
      {button}
    </Card>
  )
}

export const EmailSentToast = ({ onDismiss }: { onDismiss?: ToastToggleProps["onDismiss"] }) => (
  <Toast className="fixed bottom-5 right-5">
    <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-500 dark:bg-cyan-800 dark:text-cyan-200">
      <EnvelopeIcon className="h-5 w-5" />
    </div>
    <div className="ml-3 text-sm font-normal">Your message has been sent.</div>
    <Toast.Toggle onDismiss={onDismiss} />
  </Toast>
)
